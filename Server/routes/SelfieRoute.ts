import express, { Request, Response, Router } from "express";
import multer from "multer";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";

const __dirname = process.cwd();

import Selfie from "../TSmodels/SelfieModel.js";
import getGMTDateTime from "../utilities/getGMTDateTime.js";
import { NextFunction } from "express-serve-static-core";

const router: Router = express.Router();

//Serve selfie model directory using the express.static middleware
router.use("/models", express.static("../MLModels/selfie/"));
//Serve selfieImages directory using the express.static middleware
router.use("/selfieImages", express.static("../selfieImages/"));

//Configuring Mutter storage to store selfie images in the selfieImages directory
const selfieImagesStorage = multer.diskStorage({
	destination: function (request, file, callback) {
		callback(null, "../selfieImages/");
	},
	filename: function (request, file, callback) {
		callback(null, file.originalname);
	},
});

//Configuring Mutter storage to store incorrectly predicted selfie images for retraining in the selfieImagesRetraining directory
const selfieImagesRetrainingStorage = multer.diskStorage({
	destination: function (request, file, callback) {
		callback(null, "../selfieImagesRetraining/");
	},
	filename: function (request, file, callback) {
		callback(null, file.originalname);
	},
});

//Configuring Mutter storage to temporarily store selfies for non-tfjs backend predictions using python
const tempSelfieStorage = multer.diskStorage({
	destination: function (request, file, callback) {
		callback(null, "../MLModels/selfie/tempSelfieStorage/");
	},
	filename: function (request, file, callback) {
		callback(null, request.session.user + " " + file.originalname);
	},
});

const selfieImagesDest = multer({ storage: selfieImagesStorage });
const selfieImagesRetrainingDest = multer({ storage: selfieImagesRetrainingStorage });
const selfieImageTempDest = multer({ storage: tempSelfieStorage });

//CREATE ROUTE
router.post("/", selfieImagesDest.single("selfieImage"), async (request: Request, response: Response) => {
	if (!request.file) {
		return;
	}

	const selfie = new Selfie({
		userID: request.session.user,
		selfieImageName: request.body.selfieImageName,
		selfieImagePath: request.file.path,
		manualPrediction: request.body.manualPrediction,
		createdAt: request.body.createdAt,
		stressStatus: request.body.stressStatus,
		stressProb: request.body.stressProb,
	});

	const newSelfie = await selfie.save();

	response.status(201).json({ message: `New selfie with id: ${newSelfie._id} has been saved successfully!` });
});

//CREATE ROUTE - Saves incorrectly predicted selfies for retraining
router.post("/retraining", selfieImagesRetrainingDest.single("selfieImage"), async (request: Request, response: Response) => {
	response.status(201).json({ message: `Incorrectly predicted selfie saved for retraining successfully` });
});

//READ ROUTE
router.get("/", async (request: Request, response: Response) => {
	try {
		const selfies = await Selfie.find({ userID: request.session.user }).sort({ createdAt: 1 });
		if (selfies.length != 0) {
			response.status(200).json(selfies);
		} else {
			response.status(404).json({ message: "No selfies where found in the database" });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving selfies from database :(" });
		}
	}
});

//UPDATE ROUTE
router.patch("/:id", async (request: Request, response: Response) => {
	try {
		const selfie = await getSelfieByID(request, response);

		if (!selfie) {
			return response.status(404).json({ errorMessage: "Selfie not found" });
		}

		if (selfie.selfieImageName != request.body.selfieImageName) {
			fs.rename(`../selfieImages/${selfie.selfieImageName}`, `../selfieImages/${request.body.selfieImageName}`, (error) => {
				if (error) {
					console.error(`Error renaming selfie from ${selfie.selfieImageName} to ${request.body.selfieImageName}:`, error);
				}
				console.log(`Selfie renamed successfully from ${selfie.selfieImageName} to ${request.body.selfieImageName}.`);
			});

			if (fs.existsSync(`../selfieImagesRetraining/${selfie.selfieImageName}`) && request.body.manualPrediction === "true") {
				fs.rename(`../selfieImagesRetraining/${selfie.selfieImageName}`, `../selfieImagesRetraining/${request.body.selfieImageName}`, (error) => {
					if (error) {
						console.error(`Error renaming selfie from ${selfie.selfieImageName} to ${request.body.selfieImageName}:`, error);
					}
					console.log(`Selfie renamed successfully from ${selfie.selfieImageName} to ${request.body.selfieImageName}.`);
				});
			} else if (fs.existsSync(`../selfieImagesRetraining/${selfie.selfieImageName}`) && request.body.manualPrediction === "false") {
				// Delete the old incorrectly predicted selfie from retraining directory
				fs.unlink(`../selfieImagesRetraining/${selfie.selfieImageName}`, (error) => {
					if (error) {
						console.error(`Error deleting selfie named ${selfie.selfieImageName} from retraining directory:`, error);
					}
					console.log(`Selfie named ${selfie.selfieImageName} deleted successfully from retraining directory.`);
				});
			}
		}

		if (selfie.selfieImageName != request.body.selfieImageName) {
			selfie.selfieImageName = request.body.selfieImageName;
		}
		if (selfie.selfieImagePath != `../selfieImages/${request.body.selfieImageName}`) {
			selfie.selfieImagePath = `../selfieImages/${request.body.selfieImageName}`;
		}
		if (selfie.manualPrediction != request.body.manualPrediction) {
			selfie.manualPrediction = request.body.manualPrediction;
		}
		if (selfie.stressStatus != request.body.stressStatus) {
			selfie.stressStatus = request.body.stressStatus;
		}
		if (selfie.stressProb != request.body.stressProb) {
			selfie.stressProb = request.body.stressProb;
		}

		selfie.updatedAt = getGMTDateTime();

		const updatedSelfie = await selfie.save();

		response.status(200).json({ message: `Selfie with the ID ${selfie._id} was updated successfully \n ${updatedSelfie}` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Server encountered error occurred while updating the selfie :(" });
		}
	}
});

//UPDATE ROUTE - Updates incorrectly predicted selfies in the selfieImagesRetraining directory
router.patch("/retraining/:id", selfieImagesRetrainingDest.single("selfieImage"), async (request: Request, response: Response) => {
	try {
		response.status(200).json({ message: `Incorrectly predicted selfie in the selfieImagesRetraining has been updated` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Server encountered error occurred while updating the retraining selfie :(" });
		}
	}
});

//PREDICTION SELFIE ROUTE - Used for devices that do not support TensorFlow.js client prediction
router.post("/selfiePrediction", selfieImageTempDest.single("selfieImage"), async (request: Request, response: Response) => {
	try {
		console.log(`Received selfie prediction request from user ${request.session.user}`);

		const selfieImageFullName: string = request.session.user + " " + request.body.selfieImageName;

		//Predict the selfie
		const predictedSelfie = await selfiePrediction(selfieImageFullName);

		//Delete the temporarily stored selfie
		if (fs.existsSync(`../MLModels/selfie/tempSelfieStorage/${selfieImageFullName}`)) {
			fs.unlink(`../MLModels/selfie/tempSelfieStorage/${selfieImageFullName}`, (error) => {
				if (error) {
					console.error(`Error deleting selfie named ${selfieImageFullName} from retraining directory:`, error);
				}
				console.log(`Selfie named ${selfieImageFullName} deleted successfully from retraining directory.`);
			});
		}

		response.json({ predictedSelfie });
	} catch (error) {
		response.status(500).json({ errorMessage: "Server encountered an error while pre-processing the selfie." });
	}
});

// Maybe use Multer to save the image temporarily? Then use it in the python process, and then delete it? How would that work with multiple users at the same time? To fix this maybe name the file using the user's _id?

async function selfiePrediction(selfieImageFullName: string) {
	return new Promise((resolve, reject) => {
		let predictedSelfie: any = "";
		const selfieFilePath: string = `../MLModels/selfie/tempSelfieStorage/${selfieImageFullName}`;

		//Spawn a child process running the python Convolutional Neural Network - Prediction.py script
		// const mlmProcess = spawn("../MLModels/selfie/.venv/bin/python", ["../MLModels/selfie/Convolutional Neural Network - Prediction.py"]);
		const mlmProcess = spawn("python3.11", [path.resolve(__dirname, "../MLModels/journal/Convolutional Neural Network - Prediction.py")]);

		//Send selfie file path to python process
		mlmProcess.stdin.write(JSON.stringify({ selfieFilePath: selfieFilePath }));
		mlmProcess.stdin.end();

		//Append data sent form the python process to preProcessedJournalEntry
		mlmProcess.stdout.on("data", (data: string) => {
			predictedSelfie += data;
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
				resolve(JSON.parse(predictedSelfie));
			} catch (error) {
				reject(error);
			}
		});

		mlmProcess.on("error", (error) => {
			reject(error);
		});
	});
}

//DELETE ROUTE
router.delete("/:id", async (request: Request, response: Response) => {
	try {
		const selfie = await getSelfieByID(request, response);
		if (selfie != null) {
			await selfie.deleteOne({ ObjectId: selfie._id });

			//Delete the old incorrectly predicted selfie
			fs.unlink(`../selfieImages/${selfie.selfieImageName}`, (error) => {
				if (error) {
					console.error(`Error deleting selfie named ${selfie.selfieImageName} :`, error);
					return;
				}
				console.log(`Selfie named ${selfie.selfieImageName} deleted successfully.`);
			});

			//Delete the old incorrectly predicted selfie
			fs.unlink(`../selfieImagesRetraining/${selfie.selfieImageName}`, (error) => {
				if (error) {
					console.error(`Error deleting selfie named ${selfie.selfieImageName} :`, error);
					return;
				}
				console.log(`Selfie named ${selfie.selfieImageName} deleted successfully from retraining directory.`);
			});

			response.status(200).json({ message: `Selfie with ID ${selfie._id} was deleted successfully` });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error occurred while deleting journal from database :(" });
		}
	}
});

//Utility function for getting selfies based on _id
async function getSelfieByID(request: Request, response: Response) {
	try {
		const selfie = await Selfie.findById(request.params.id);

		if (selfie != null) {
			return selfie;
		} else {
			response.status(404).json({ message: `Selfie not found in database` });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: `Server encountered error while retrieving selfie from database :(` });
		}
	}
}

//Export Journal Router
export default router;
