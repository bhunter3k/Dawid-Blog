//Importing ExpressJS along with pre-defined types used for TypeScript's static type checking
import express, { Request, Response, Router } from "express";
const router: Router = express.Router();
import Journal from "../TSmodels/JournalModel.js";
import getGMTDateTime from "../utilities/getGMTDateTime.js";
import fs, { copyFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";

const __dirname = process.cwd();

//Serve journal model directory using the express.static middleware
router.use("/models", express.static("../MLModels/journal/"));

//READ ALL ROUTE
router.get("/", async (request: Request, response: Response) => {
	try {
		const journals = await Journal.find({ userID: request.session.user }).sort({ createdAt: 1 });
		if (journals.length != 0) {
			response.status(200).json(journals);
		} else {
			response.status(404).json({ message: "No journals where found in the database" });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving journals from database :(" });
		}
	}
});

//READ ONE ROUTE
router.get("/:id", async (request: Request, response: Response) => {
	try {
		response.status(200).json(await getJournalByID(request, response));
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving journal from database :(" });
		}
	}
});

//CREATE ROUTE
router.post("/", async (request: Request, response: Response) => {
	let stressStatus: string = request.body.stressStatus;
	let manualEntry: boolean = false;

	if (stressStatus.includes("(Manual)")) {
		manualEntry = true;
		//Remove the (Manual) part
		stressStatus = stressStatus.substring(0, stressStatus.length - 9);
	}

	const journal = new Journal({
		userID: request.session.user,
		journalTitle: request.body.journalTitle,
		journalEntry: request.body.journalEntry,
		stressStatus: stressStatus,
		stressProb: request.body.stressProb,
	});

	try {
		const newJournal = await journal.save();
		if (manualEntry) {
			saveEntryForRetraining(newJournal);
		}
		response.status(201).json({ message: `Journal Entry '${newJournal.journalTitle}' has been saved successfully!` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Error occurred while creating new journal :(" });
		}
	}
});

//UPDATE ROUTE
router.patch("/:id", async (request: Request, response: Response) => {
	try {
		const journal = await getJournalByID(request, response);

		if (!journal) {
			return response.status(404).json({ errorMessage: "Journal not found" });
		}

		let stressStatus: string = request.body.stressStatus;
		let manualEntry: boolean = false;

		if (stressStatus.includes("(Manual)")) {
			manualEntry = true;
			//Remove the (Manual) part
			stressStatus = stressStatus.substring(0, stressStatus.length - 9);
		}

		if (journal.journalTitle != request.body.journalTitle) {
			journal.journalTitle = request.body.journalTitle;
		}
		if (journal.journalEntry != request.body.journalEntry) {
			journal.journalEntry = request.body.journalEntry;
		}
		if (journal.stressStatus != stressStatus) {
			journal.stressStatus = stressStatus;
		}
		if (journal.stressProb != request.body.stressProb) {
			journal.stressProb = request.body.stressProb;
		}
		journal.updatedAt = getGMTDateTime();

		const updatedJournal = await journal.save();
		if (manualEntry) {
			saveEntryForRetraining(updatedJournal);
		}

		response.status(200).json({ message: `Journal with the ID ${journal._id} was updated successfully \n ${updatedJournal}` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Server encountered error occurred while updating the journal :(" });
		}
	}
});

//DELETE ROUTE
router.delete("/:id", async (request: Request, response: Response) => {
	try {
		const journal = await getJournalByID(request, response);
		if (journal != null) {
			await journal.deleteOne({ ObjectId: journal._id });
			response.status(200).json({ message: `Journal with ID ${journal._id} was deleted successfully` });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error occurred while deleting journal from database :(" });
		}
	}
});

//PREPROCESS ENTRY ROUTE
//post is used as we are updating a resource, in this case, updating a raw journal entry
router.post("/journalEntryPreProcessing", async (request: Request, response: Response) => {
	try {
		console.log(`Received journal pre-processing request from user ${request.session.user}`);
		//Process the journal entry
		const preProcessedJournalEntry = await journalEntryPreProcessing(request.body.journalEntry);

		response.json({ preProcessedJournalEntry });
	} catch (error) {
		response.status(500).json({ errorMessage: "Server encountered an error while pre-processing the journal entry." });
	}
});

//Asynchronous function to pre-process the journal entry using a python child process
async function journalEntryPreProcessing(journalEntry: string) {
	return new Promise((resolve, reject) => {
		let preProcessedJournalEntry: any = "";

		//Spawn a child process running the python jBinary Neural Network Classifier - Preprocessing.py script
		// const mlmProcess = spawn("python", ["../MLModels/journal/Binary Neural Network Classifier - Preprocessing.py"]);
		const mlmProcess = spawn("python3.11", [path.resolve(__dirname, "../MLModels/journal/Binary Neural Network Classifier - Preprocessing.py")]);

		//Send entry to python process
		mlmProcess.stdin.write(JSON.stringify({ entry: journalEntry }));
		mlmProcess.stdin.end();

		//Append data sent form the python process to preProcessedJournalEntry
		mlmProcess.stdout.on("data", (data: string) => {
			preProcessedJournalEntry += data;
		});

		//Handle errors from the child process
		mlmProcess.stderr.on("data", (data: string) => {
			console.error(`Error from child process: ${data}`);
			// Reject the promise with the error message
			reject(data.toString());
		});

		//On python process closing, resolve the promise and parse it into a json format
		mlmProcess.stdout.on("close", () => {
			try {
				resolve(JSON.parse(preProcessedJournalEntry));
			} catch (error) {
				reject(error);
			}
		});

		mlmProcess.on("error", (error) => {
			reject(error);
		});
	});
}

//PREDICTION ENTRY ROUTE - Used for devices that do not support TensorFlow.js client prediction
//post is used as we are updating a resource, in this case, updating a raw journal entry
router.post("/journalEntryPrediction", async (request: Request, response: Response) => {
	try {
		console.log(`Received journal prediction request from user ${request.session.user}`);
		//Predict the journal entry
		const predictedJournalEntry = await journalEntryPrediction(request.body.journalEntry);
		console.log(predictedJournalEntry);

		response.json({ predictedJournalEntry });
	} catch (error) {
		response.status(500).json({ errorMessage: "Server encountered an error while pre-processing the journal entry." });
	}
});

async function journalEntryPrediction(journalEntry: string) {
	return new Promise((resolve, reject) => {
		let predictedJournalEntry: any = "";

		//Spawn a child process running the python Binary Neural Network Classifier - Prediction.py script
		// const mlmProcess = spawn("../MLModels/journal/.venv/bin/python", ["../MLModels/journal/Binary Neural Network Classifier - Prediction.py"]);
		const mlmProcess = spawn("python3.11", [path.resolve(__dirname, "../MLModels/journal/Binary Neural Network Classifier - Prediction.py")]);

		//Send entry to python process
		mlmProcess.stdin.write(JSON.stringify({ entry: journalEntry }));
		mlmProcess.stdin.end();

		//Append data sent form the python process to preProcessedJournalEntry
		mlmProcess.stdout.on("data", (data: string) => {
			predictedJournalEntry += data;
		});

		//Handle errors from the child process
		mlmProcess.stderr.on("data", (data: string) => {
			console.error(`Error from child process: ${data}`);
			// Reject the promise with the error message
			reject(data.toString());
		});

		//On python process closing, resolve the promise and parse it into a json format
		mlmProcess.stdout.on("close", () => {
			try {
				resolve(JSON.parse(predictedJournalEntry));
			} catch (error) {
				reject(error);
			}
		});

		mlmProcess.on("error", (error) => {
			reject(error);
		});
	});
}

//Function to add incorrectly predicted journal entries to a detected JSON file for future model retraining
function saveEntryForRetraining(entry: any) {
	const data = fs.readFileSync("../MLModels/journal/entries_for_retraining.json", "utf-8");
	//Convert JSON file into a JavaScript object
	const jsObject = JSON.parse(data);

	let index = undefined;
	let counter = -1;

	for (let x of jsObject.entries_for_retraining) {
		counter += 1;
		if (x._id === entry._id.toString()) {
			index = counter;
			break;
		}
	}

	//If entry already exists in the JSON file, update its fields
	if (index != undefined) {
		jsObject.entries_for_retraining[index] = {
			_id: entry._id,
			journalTitle: entry.journalTitle,
			journalEntry: entry.journalEntry,
			stressStatus: entry.stressStatus,
			stressProb: entry.stressProb,
		};
	}
	//Else append the new entry to the JSON file
	else {
		jsObject.entries_for_retraining.push({
			_id: entry._id,
			journalTitle: entry.journalTitle,
			journalEntry: entry.journalEntry,
			stressStatus: entry.stressStatus,
			stressProb: entry.stressProb,
		});
	}

	//Covert the JavaScript object into a JSON format
	const json = JSON.stringify(jsObject);

	fs.writeFileSync("../MLModels/journal/entries_for_retraining.json", json, "utf-8");
}

//Utility function for getting journals based on _id
async function getJournalByID(request: Request, response: Response) {
	try {
		const journal = await Journal.findById(request.params.id);
		if (journal != null) {
			return journal;
		} else {
			response.status(404).json({ message: `Journal with id ${request.params.id} not found in database` });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: `Server encountered error while retrieving journal from database :(` });
		}
	}
}

//Export Journal Router
export default router;
