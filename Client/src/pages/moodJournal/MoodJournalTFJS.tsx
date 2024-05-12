import { useState, useEffect, FormEvent, useRef } from "react";
import { SearchBar, Dialog } from "../../components";
//React Quill is an open source text editor used for journal entries - https://www.npmjs.com/package/react-quill
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import getGMTDateTime from "../../utilities/getGMTDateTime";
import loadTFJSBackend from "../../utilities/loadTFJSBackend";
//Open source package which strips HTML tags from strings - https://www.npmjs.com/package/string-strip-html
import { stripHtml } from "string-strip-html";
//Loading spinner icon that appears during fetch requests
import { TailSpin } from "react-loader-spinner";
//https://react-icons.github.io/react-icons/
import { IoCreateOutline, IoAlertCircleOutline, IoDocumentsOutline } from "react-icons/io5";
import { BiReset, BiArrowFromLeft, BiArrowFromRight } from "react-icons/bi";
import { MdOutlineDeleteOutline, MdOutlineSmartToy } from "react-icons/md";

import * as tfjs from "@tensorflow/tfjs";

import { Tooltip as ReactTooltip } from "react-tooltip";

//Defined structure of a Journal Object
type Journal = {
	//_id, createdAt are optional
	_id?: string;
	journalTitle: string;
	journalEntry: string;
	createdAt?: Date;
	stressStatus: string;
	stressProb: string;
};

export const MoodJournalTFJS = () => {
	//---States---//
	//State that stores the current date and time
	const [dateGMT, setDateGMT] = useState<string>(getGMTDateTime().toISOString().slice(0, 19));
	//State that determines whether current date and time should be updated every second
	const [intervalRunning, setIntervalRunning] = useState<boolean>(true);
	const [currentEntryID, setCurrentEntryID] = useState<string>();
	const [titleValue, setTitleValue] = useState<string>("");
	const [quillValue, setQuillValue] = useState<string>("");
	//State to show/hide loading spinner based on fetch request completion
	const [loading, setLoading] = useState<boolean>(false);
	//Array that holds all entries in the database - each entry must follow the defined Journal Type
	const [entryArray, setEntryArray] = useState<Journal[]>([]);
	//Array that holds filtered entries in an array based on user search in search bar
	const [filteredEntryArray, setFilteredEntryArray] = useState<Journal[]>([]);
	//State that holds dates of entries created on a specific date
	const [entriesTodayArray, setEntriesTodayArray] = useState<string[]>([]);
	//State that holds an error message telling that user that no more previous/next entries exist
	const [prevNextErrorMessage, setPrevNextErrorMessage] = useState<string>("");
	//Bool state that determines whether to show the old entries table or not
	const [showOldJournalEntries, setShowOldJournalEntries] = useState<boolean>(false);
	//Bool state to signify if an entry is being edited
	const [entryEdit, setEntryEdit] = useState<boolean>(false);
	//Bool state to signify if an entry is being deleted
	const [entryDelete, setEntryDelete] = useState<boolean>(false);
	const [entryTitleUnique, setEntryTitleUnique] = useState<boolean>(true);
	//State to track if a entry has been submitted either during creation or editing
	const [entrySubmitted, setEntrySubmitted] = useState<boolean>(false);

	//---Dialog States - used by the imported Dialog component---//
	const [dialogShow, setDialogShow] = useState<boolean>(false);
	const [dialogHeader, setDialogHeader] = useState<string>("");
	const [dialogAction, setDialogAction] = useState<"Delete" | "No Action">("No Action");
	const [dialogConfirmation, setDialogConfirmation] = useState<"confirmation" | "understand" | "manualPrediction">("confirmation");

	//--- Journal MLM States ---//
	const [model, setModel] = useState<any>();
	//Holds the predicted stress made by the journal model
	const [stressState, setStressState] = useState<string>("");
	//Holds the probability of the prediction made by the journal model
	const [stressProb, setStressProb] = useState<string>("");

	//---References---//
	const journalTableRef = useRef<HTMLTableElement>(null);
	const prevEntryBtnRef = useRef<HTMLButtonElement>(null);
	const nextEntryBtnRef = useRef<HTMLButtonElement>(null);

	//calls getAllJournals() when journal page is mounted
	useEffect(() => {
		getAllJournals();
	}, []);

	//used to see how many entries where made on a specific date - only done in entry edit mode
	//the setEntriesToday state is later used in the Entries for this day: label
	useEffect(() => {
		if (entryEdit) {
			let tempArray: string[] = [];
			for (let journal of entryArray) {
				if (journal.createdAt != null) {
					//if dateGMT (yyyy-mm-dd) === journal.createdAt (yyyy-mm-dd) then add it to tempArray
					if (dateGMT.slice(0, 10) === journal.createdAt.toString().slice(0, 10)) {
						tempArray.push(journal.createdAt.toString().slice(0, 19));
					}
				}
			}
			setEntriesTodayArray(tempArray);
		}
	}, [dateGMT]);

	//gets the current date and time every second - effectively acting as a realtime clock
	//Only runs if the user is creating a new journal
	useEffect(() => {
		let interval: number | NodeJS.Timeout = 0;

		if (intervalRunning == true) {
			//setInterval calls the containing arrow function every 1000 milliseconds
			interval = setInterval(() => {
				setDateGMT(getGMTDateTime().toISOString().slice(0, 19));
			}, 1000);
		} else {
			clearInterval(interval);
		}

		//cleanup function to prevent memory leaks when the intervalRunning state is false
		return () => clearInterval(interval);
	}, [intervalRunning]);

	//UseEffect hook to ensure the entry title is unique when creating a new entry
	useEffect(() => {
		if (entryEdit === false) {
			const newTitleValue = titleValue.trim().toLowerCase();

			for (let journal of entryArray) {
				if (journal.journalTitle.trim().toLowerCase() === newTitleValue) {
					setEntryTitleUnique(false);
					break;
				} else {
					setEntryTitleUnique(true);
				}
			}
		}
	}, [titleValue]);

	//UseEffect hook to track if changes have been made to an entry during editing
	useEffect(() => {
		if (entryEdit === true) {
			const currentEntry = entryArray.find((entry) => entry._id === currentEntryID);

			const rawTitleValue = titleValue.trim();
			const rawQuillValue = quillValue.trim();

			if (rawTitleValue !== currentEntry?.journalTitle || rawQuillValue !== currentEntry.journalEntry) {
				setEntrySubmitted(false);
			} else {
				setEntrySubmitted(true);
			}
		}
	}, [titleValue, quillValue]);

	//useEffect hook loads the journal model as soon as the page mounts
	useEffect(() => {
		console.log("Attempting to load model...");

		const fetchSelfieModel = async () => {
			await loadTFJSBackend;

			console.log(tfjs.getBackend());

			//Load the journal model that is stored on the server-side
			const model = await tfjs.loadLayersModel("https://tpd20seu.projects.cmp.uea.ac.uk/journal/models/TFJSBinaryNeuralNetworkClassifier/model.json");
			setModel(model);
			console.log("Fetch journal model completed :)");
		};
		fetchSelfieModel();
	}, []);

	//Custom configurations for the Quill text editor defining behaviors and features//
	const modules = {
		toolbar: [[{ "size": ["small", false, "large", "huge"] }], ["bold", "italic", "underline"], [{ "list": "ordered" }, { "list": "bullet" }], ["clean"]],
	};
	const formats = ["size", "bold", "italic", "underline", "list", "bullet", "clean"];

	function reset() {
		//set all states to their default values following a journal form request
		setTitleValue("");
		setCurrentEntryID("");
		setQuillValue("");
		setIntervalRunning(true);
		setEntryDelete(false);
		setEntryEdit(false);
		setDialogAction("No Action");
		setDialogConfirmation("confirmation");
		setStressState("");
		setStressProb("");
		setEntrySubmitted(false);
	}

	//asynchronous function handling all submit events on journal form
	async function handleJournalFormSubmit(event: FormEvent): Promise<void> {
		event.preventDefault();

		setLoading(true);

		let newJournal: Journal = {
			journalTitle: "",
			journalEntry: "",
			stressStatus: "",
			stressProb: "",
		};
		let status = "";
		let prob = "";

		if (dialogConfirmation === "manualPrediction") {
			if (stressState === "Stressed") {
				status = "Not Stressed (Manual)";
			} else {
				status = "Stressed (Manual)";
			}
			prob = "100%";
			newJournal = createNewJournal(status, prob);
		}
		//else if to only call the predictStress() function when creating or editing a journal
		else if (!entryDelete) {
			const result = await predictStress();
			if (result) {
				status = result.status;
				prob = result.prob;
				newJournal = createNewJournal(status, prob);
			}
		}

		//if user is creating a new journal
		if (!entryEdit) {
			await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/journal", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newJournal),
				credentials: "include",
			});

			console.log(`POST request with journal '${newJournal.journalTitle}' was sent successfully to the server!`);

			setDialogHeader(
				`New journal entry titled '${titleValue.trim()}' has been created successfully!\n\nOur model has marked the entry as ${status} with a probability of ${prob}`
			);
		}
		//if user is deleting an existing journal
		else if (entryEdit && entryDelete) {
			await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/journal/${currentEntryID}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});

			console.log(`DELETE request with journal '${titleValue}' was sent successfully to the server!`);

			setDialogHeader(`Journal entry titled '${titleValue}' has been deleted!`);
		}
		//if user is editing an existing journal
		else if (entryEdit) {
			await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/journal/${currentEntryID}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newJournal),
				credentials: "include",
			});

			console.log(`PATCH request with journal '${newJournal.journalTitle}' was sent successfully to the server!`);

			setDialogHeader(
				`The journal entry titled '${titleValue.trim()}' has been edited successfully!\n\nOur model has marked the entry as ${status} with a probability of ${prob}`
			);
		}

		//update entryArray following request
		getAllJournals();

		setLoading(false);
		setDialogConfirmation("understand");
		setDialogShow(true);
	}

	//Simple function to find the higher number in an array of two numbers
	function argmax(array: [number, number]): number {
		if (array[0] > array[1]) {
			return 0;
		} else {
			return 1;
		}
	}

	//Function for predicting stress using the journal model and TenorFlow.js
	async function predictStress() {
		try {
			setLoading(true);

			const processedJournalEntry = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/journal/journalEntryPreProcessing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					"journalEntry": stripHtml(quillValue).result.trim(),
				}),
				credentials: "include",
			});

			if (!processedJournalEntry.ok) {
				throw new Error(`Error: ${processedJournalEntry.status}`);
			}

			//Extract JSON from response body
			const responseBody = await processedJournalEntry.json();

			const inputEntryTransformed = responseBody.preProcessedJournalEntry.inputEntryTransformed;

			//Convert the JavaScript list into a TensorFlow.js tensor with the desired shape (1, 2)
			const tensor = tfjs.tensor2d(inputEntryTransformed, [1, inputEntryTransformed[0].length]);

			//Predict the stress level of the user's selfie using the journal model and TenorFlow.js
			const prediction = model.predict(tensor);
			console.log("prediction = ");
			console.log(prediction);

			//Extract probability scores of the prediction by converting the tensor into a regular array
			const scores = prediction.arraySync()[0];
			console.log("scores =");
			console.log(scores);

			//scores stores two prediction numbers in an array equal to 1
			//argmax is called to extract the higher prediction which will either be point towards the selfie being "Stressed" or "Not Stressed"
			const predictedClass = argmax(scores);

			const status = predictedClass === 1 ? "Stressed" : "Not Stressed";
			const prob = `${(scores[predictedClass] * 100).toFixed(2)}%`;

			setStressState(status);
			setStressProb(prob);

			//Dispose tensors to release memory
			tensor.dispose();
			prediction.dispose();

			setLoading(false);

			return { status, prob };
		} catch (error) {
			console.log("error occurred");
			console.error("Error:", error);
		}
	}

	//function creates a new Journal object
	function createNewJournal(status: string, prob: string): Journal {
		const journal: Journal = {
			journalTitle: titleValue.trim(),
			journalEntry: quillValue.trim(),
			stressStatus: status,
			stressProb: prob,
		};

		return journal;
	}

	//asynchronous function getting all journals from the database
	async function getAllJournals(): Promise<void> {
		const journalResponse = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/journal", {
			method: "Get",
			credentials: "include",
		});
		const journals = await journalResponse.json();

		//if resolved promise is an array that contains an object with a key "journalTitle"
		if (Array.isArray(journals) && journals[0].hasOwnProperty("journalTitle") && journals.length != 0) {
			setEntryArray(journals);
			setFilteredEntryArray(journals);
		} else {
			setEntryArray([]);
			setFilteredEntryArray([]);
		}
	}

	//function for cycling through previous and next journals using prev/next buttons
	function prevNextJournal(direction: "prev" | "next"): void {
		if (!prevEntryBtnRef.current || !nextEntryBtnRef.current) {
			return;
		}

		//get index of current journal in the entryArray
		let index: number = 0;

		for (const journal of entryArray) {
			if (journal._id === currentEntryID) {
				index = entryArray.indexOf(journal);
				break;
			}
		}

		let prevNextJournal: Journal | undefined = undefined;

		if (direction === "prev") {
			if (entryArray[index - 1] === undefined) {
				setPrevNextErrorMessage("No more previous journals exist!");
				prevEntryBtnRef.current.disabled = true;
			} else {
				prevNextJournal = entryArray[index - 1];
				prevEntryBtnRef.current.disabled = false;
				nextEntryBtnRef.current.disabled = false;
			}
		} else if (direction === "next") {
			if (entryArray[index + 1] === undefined) {
				setPrevNextErrorMessage("No more following journals exist!");
				nextEntryBtnRef.current.disabled = true;
			} else {
				prevNextJournal = entryArray[index + 1];
				nextEntryBtnRef.current.disabled = false;
				prevEntryBtnRef.current.disabled = false;
			}
		}

		if (prevNextJournal) {
			setStressState(prevNextJournal.stressStatus);
			setStressProb(prevNextJournal.stressProb);
			setCurrentEntryID(prevNextJournal._id);
			setTitleValue(prevNextJournal.journalTitle);
			setQuillValue(prevNextJournal.journalEntry);
			setPrevNextErrorMessage("");
			if (prevNextJournal.createdAt != undefined) {
				setDateGMT(prevNextJournal.createdAt.toString().slice(0, 19));
			}
		}
	}

	//function that retrieves details of selected journal from the table for viewing/editing/deletion
	function handleJournalTitleCellClick(event: React.MouseEvent<HTMLDivElement>): void {
		//typeScript type assertion to cast the event as a HTMLDivElement
		const journalTitle = (event.target as HTMLDivElement).innerText;
		for (let journal of entryArray) {
			if (journalTitle === journal.journalTitle) {
				setStressState(journal.stressStatus);
				setStressProb(journal.stressProb);
				setCurrentEntryID(journal._id);
				setTitleValue(journal.journalTitle);
				setQuillValue(journal.journalEntry);
				setPrevNextErrorMessage("");
				setIntervalRunning(false);
				if (journal.createdAt != null) {
					setDateGMT(journal.createdAt.toString().slice(0, 19));
				}
				setEntryEdit(true);
				setEntrySubmitted(true);
				setShowOldJournalEntries(false);
			}
		}
	}

	//calls formatTable() upon change in the showJournalEntries/filteredEntryArray state
	useEffect(() => {
		formatTable();
	}, [showOldJournalEntries, filteredEntryArray]);

	//function that merges the table's date cells if they have the same date. Used to improve readability of table
	function formatTable(): void {
		const tableTag = journalTableRef.current;
		let dateCell = null;

		if (!tableTag) {
			return;
		}

		for (let row of tableTag.rows) {
			const firstCell = row.cells[0];

			if (dateCell === null || firstCell.innerText !== dateCell.innerText) {
				dateCell = firstCell;
			} else {
				dateCell.rowSpan++;
				firstCell.remove();
				// dateCell.rowSpan++;
				// firstCell.remove();
			}
		}
	}

	//asynchronous function that handles searching the table. Table will update based on user search
	//React handles state changes asynchronously, therefore, the await keyword was added to each state change
	//to ensure that it is completed before the next line of code is executed. It ensures that the formatTable() function
	//only runs once the table has been updated based on the user's search.
	async function search(event: React.ChangeEvent<HTMLInputElement>) {
		const searchTerm = event.target.value.trim();

		if (searchTerm === "") {
			// setFilteredEntryArray([]);
			setFilteredEntryArray(entryArray);
		} else {
			// setFilteredEntryArray([]);
			const tempArray: Journal[] = entryArray.filter((journal) => {
				return journal.journalTitle.toLowerCase().includes(searchTerm.toLowerCase());
			});

			setFilteredEntryArray(tempArray);
		}
	}

	return (
		<>
			{loading && (
				<div id="loadingSpinnerContainer">
					<TailSpin
						visible={true}
						height="80"
						width="80"
						color="#FED362"
						ariaLabel="tail-spin-loading"
						radius="1"
						wrapperStyle={{}}
						wrapperClass=""
					/>
					<h2>Processing Request....</h2>
				</div>
			)}

			{!loading && (
				<>
					<ReactTooltip id="invalidEntryTooltip" place="top" content="Your journal entry must have a title and content" />
					<ReactTooltip id="invalidEntryTooltip2" place="top" content="Your journal entry title must be unique" />
					<ReactTooltip
						id="entryNotSubmitted"
						place="top"
						content={!entryEdit ? "This journal has not been submitted yet" : "The changes to this journal have not been submitted yet"}
					/>
					<ReactTooltip id="manualPredictionTooltip" place="top" content="Click here if the stress prediction of this journal is incorrect" />

					<h1>Mood Journal</h1>
					<p className="infoP">
						Your personal brain dump! A page for writing journal entries about your day, your mood, or anything else on your mind :)
					</p>
					<p className="infoP">The journal model will make stress predictions in the browser on your device.</p>

					<hr />

					{!showOldJournalEntries && (
						<form id="journalForm" onSubmit={handleJournalFormSubmit}>
							<Dialog
								header={dialogHeader}
								dialogShow={dialogShow}
								dialogConfirmation={dialogConfirmation}
								// onConfirm is tied to a submit button which triggers the form's onSubmit event
								onConfirm={() => {
									if (dialogAction === "Delete") {
										setEntryDelete(true);
									}
									setDialogShow(false);
								}}
								onCancel={() => {
									setDialogShow(false);
								}}
								onUnderstand={() => {
									reset();
									setDialogShow(false);
								}}
								onManualPrediction={() => {
									setDialogShow(false);
								}}
							/>

							<div id="journalModeContainer">
								{entryEdit ? <h2>View, Edit, or Delete Entry</h2> : <h2>Create New Entry</h2>}
								{stressState !== "" && stressProb !== "" && (
									<div
										id="manualPredictionContainer"
										data-tooltip-id={"manualPredictionTooltip"}
										onClick={() => {
											setDialogHeader(
												"If you believe that our model has made an incorrect prediction on your selfie, please click the confirm button.\n\nYour selfie will be marked with the correct stress status and this entry will be used to help train our model in the future."
											);
											setDialogConfirmation("manualPrediction");
											setDialogShow(true);
										}}
									>
										<p id="manualPredictionP">Wrong?</p>
										<IoAlertCircleOutline />
									</div>
								)}
							</div>

							<div id="journalTopContainer">
								<div id="journalTopEntryTitleContainer">
									<label id="entryTitleLbl" htmlFor="Title">
										{entrySubmitted && <h3 id="entryTitleSubmittedH3"> Entry Title:</h3>}
										{!entrySubmitted && (
											<h3 id="entryTitleNotSubmittedH3" data-tooltip-id="entryNotSubmitted">
												Entry Title:*
											</h3>
										)}
									</label>

									<input
										type="text"
										id="entryTitleTxt"
										placeholder="Enter title for your journal entry..."
										name="Title"
										maxLength={50}
										value={titleValue}
										onChange={(event) => {
											setTitleValue(event.target.value);
										}}
									></input>

									<label id="stressLbl">
										{stressState === "" || stressProb === "" ? (
											<h3>Stress Status Unknown</h3>
										) : (
											<h3 id={stressState === "Stressed" ? "stressed" : "notStressed"}>{`${stressState} - ${stressProb}`}</h3>
										)}
									</label>
								</div>

								<div id="journalTopControlsContainer">
									{!entryEdit && (
										<>
											<button
												type="button"
												id="journalPredictStressBtn"
												className="journalTopControlBtn"
												onClick={() => {
													predictStress();
												}}
												disabled={titleValue === "" || stripHtml(quillValue).result === "" || entryTitleUnique === false}
												data-tooltip-id={
													titleValue === "" || stripHtml(quillValue).result.trim() === ""
														? "invalidEntryTooltip"
														: entryTitleUnique === false
														? "invalidEntryTooltip2"
														: "nothing"
												}
											>
												Predict Stress
												<MdOutlineSmartToy id="journalPredictStressIcon" className="journalTopControlBtnIcon" />
											</button>

											<button
												type="submit"
												id="journalCreateBtn"
												className="journalTopControlBtn"
												onClick={(event) => {
													event.preventDefault();
													setDialogHeader("Are you happy with submitting your entry?");
													setDialogShow(true);
												}}
												disabled={titleValue === "" || stripHtml(quillValue).result === "" || entryTitleUnique === false}
												data-tooltip-id={
													titleValue === "" || stripHtml(quillValue).result.trim() === ""
														? "invalidEntryTooltip"
														: entryTitleUnique === false
														? "invalidEntryTooltip2"
														: "nothing"
												}
											>
												Submit New Entry
												<IoCreateOutline id="journalSubmitBtnArrow" className="journalTopControlBtnIcon" />
											</button>
										</>
									)}

									{entryEdit && (
										<>
											<button
												type="button"
												id="journalResetBtn"
												className="journalTopControlBtn"
												onClick={() => {
													for (let journal of entryArray) {
														if (currentEntryID === journal._id) {
															setTitleValue(journal.journalTitle);
															setQuillValue(journal.journalEntry);
															setStressState(journal.stressStatus);
															setStressProb(journal.stressProb);
														}
													}
												}}
											>
												Reset Changes
												<BiReset id="journalResetBtnIcon" className="journalTopControlBtnIcon" />
											</button>

											<button
												type="submit"
												id="journalDeleteBtn"
												className="journalTopControlBtn"
												onClick={(event) => {
													event.preventDefault();
													setDialogHeader("Are you sure you want to delete this journal?");
													setDialogAction("Delete");
													setDialogShow(true);
												}}
											>
												Delete Journal
												<MdOutlineDeleteOutline id="journalDeleteBtnIcon" className="journalTopControlBtnIcon" />
											</button>

											<button
												type="button"
												id="journalPredictStressBtn"
												className="journalTopControlBtn"
												onClick={() => {
													predictStress();
												}}
												disabled={titleValue === "" || stripHtml(quillValue).result === "" || entryTitleUnique === false}
												data-tooltip-id={
													titleValue === "" || stripHtml(quillValue).result.trim() === ""
														? "invalidEntryTooltip"
														: entryTitleUnique === false
														? "invalidEntryTooltip2"
														: "nothing"
												}
											>
												Predict Stress
												<MdOutlineSmartToy id="journalPredictStressIcon" className="journalTopControlBtnIcon" />
											</button>

											<button
												type="submit"
												id="journalSaveBtn"
												className="journalTopControlBtn"
												onClick={(event) => {
													event.preventDefault();
													setDialogHeader("Are you sure you want to save the changes made to this journal?");
													setDialogShow(true);
												}}
												disabled={titleValue === "" || stripHtml(quillValue).result === "" || entryTitleUnique === false}
												data-tooltip-id={
													titleValue === "" || stripHtml(quillValue).result.trim() === ""
														? "invalidEntryTooltip"
														: entryTitleUnique === false
														? "invalidEntryTooltip2"
														: "nothing"
												}
											>
												Submit Entry Changes
												<IoCreateOutline id="journalSubmitBtnArrow" className="journalTopControlBtnIcon" />
											</button>
										</>
									)}
								</div>
							</div>

							<div id="quillJournalContainer">
								<ReactQuill
									id="entryArea"
									theme="snow"
									modules={modules}
									formats={formats}
									value={quillValue}
									onChange={setQuillValue}
									placeholder="Begin your journal entry..."
								/>
							</div>

							<div id="journalBottomContainer">
								{entryEdit && (
									<h3 id="entryNumberLbl">
										Entries for this day: {entriesTodayArray.indexOf(dateGMT) + 1}/{entriesTodayArray.length}
									</h3>
								)}

								<div id="journalBottomControlsContainer">
									{entryEdit && (
										<button
											type="button"
											id="cancelEditBtn"
											className="journalBottomControlBtn"
											onClick={() => {
												setCurrentEntryID("");
												setQuillValue("");
												setTitleValue("");
												setPrevNextErrorMessage("");
												setIntervalRunning(true);
												setEntryEdit(false);
												setEntrySubmitted(false);
												setShowOldJournalEntries(false);
												setStressProb("");
												setStressState("");
											}}
										>
											Create New Entry
											<IoCreateOutline id="createNewJournalBtnIcon" />
										</button>
									)}

									{entryEdit && (
										<button
											type="button"
											id="journalPrevEntryBtn"
											ref={prevEntryBtnRef}
											className="journalBottomControlBtn"
											onClick={() => {
												prevNextJournal("prev");
											}}
										>
											<BiArrowFromRight className="journalDateArrow" />
											Prev Entry
										</button>
									)}

									<div id="dateLbl">{dateGMT.replace("T", "\n")}</div>

									{entryEdit && (
										<button
											type="button"
											id="journalNextEntryBtn"
											ref={nextEntryBtnRef}
											className="journalBottomControlBtn"
											onClick={() => {
												prevNextJournal("next");
											}}
										>
											Next Entry
											<BiArrowFromLeft className="journalDateArrow" />
										</button>
									)}

									<button
										type="button"
										id="journalEntryDateBtn"
										className="journalBottomControlBtn"
										onClick={() => {
											setCurrentEntryID("");
											setQuillValue("");
											setTitleValue("");
											setPrevNextErrorMessage("");
											setIntervalRunning(false);
											setEntryEdit(false);
											setShowOldJournalEntries(true);
											setEntrySubmitted(true);
										}}
									>
										View Old Entries
										<IoDocumentsOutline id="viewOldEntriesIcon" />
									</button>
								</div>

								<p id="prevNextErrorMessageP">{prevNextErrorMessage}</p>
							</div>
						</form>
					)}

					{showOldJournalEntries && (
						<div id="viewJournalEntriesContainer">
							<table id="viewJournalEntriesTable" ref={journalTableRef}>
								<caption>
									<div id="viewJournalEntriesTitleContainer">
										<h2 id="viewJournalEntriesTitleH2">
											Your Old Journal Entries <IoDocumentsOutline id="viewOldEntriesIcon" />
										</h2>
										<SearchBar
											placeholder="Search table by title..."
											onChange={(event) => {
												search(event);
											}}
										/>
										{filteredEntryArray.length === 0 && <p>No entry titles matching the searched term were found :/</p>}
									</div>
								</caption>
								<thead>
									<tr>
										<th>Date</th>
										<th>Time</th>
										<th>Title (Click to edit)</th>
										<th>Stress</th>
									</tr>
								</thead>
								<tbody>
									{filteredEntryArray.map((journal: Journal, index) => (
										<tr key={index}>
											<td data-cell="Journal Date">{journal.createdAt?.toString().slice(0, 10)}</td>
											<td data-cell="Journal Time">{journal.createdAt?.toString().slice(11, 19)}</td>
											<td data-cell="Journal Title">
												<div className="journalTitleCell" onClick={(event) => handleJournalTitleCellClick(event)}>
													{journal.journalTitle}
												</div>
											</td>
											<td
												data-cell="Journal Stress"
												className={journal.stressStatus === "Stressed" ? "stressedCell" : "notStressedCell"}
											>{`${journal.stressStatus} - ${journal.stressProb}`}</td>
										</tr>
									))}
								</tbody>
							</table>

							<div id="viewJournalEntriesBottomContainer">
								<button
									type="button"
									id="createNewJournalBtn"
									onClick={() => {
										setCurrentEntryID("");
										setQuillValue("");
										setTitleValue("");
										setIntervalRunning(true);
										setEntryEdit(false);
										setShowOldJournalEntries(false);
										setStressProb("");
										setStressState("");
									}}
								>
									Create New Entry
									<IoCreateOutline id="createNewJournalBtnIcon" />
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
};
