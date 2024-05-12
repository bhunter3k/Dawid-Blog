import { useState, useEffect, FormEvent, useRef } from "react";
import { Video, Canvas, SearchBar, Dialog } from "../../components";

//TensorFlow.js is used to make predictions using my trained CNN selfie model in the browser
import * as tfjs from "@tensorflow/tfjs";

//Trained TensorFlow.js model used to detect faces in the video element on the page
import * as faceapi from "@vladmandic/face-api";

//A pure JavaScript function that preprocesses the selfie image extracted form the video element on the page
//Was implemented using pure JavaScript due to relentless errors given by TypeScript that I was unable to fix
import imageProcessing from "../../utilities/tfjsImageProcessing";

//Simple function to get the current GMT DateTime
import getGMTDateTime from "../../utilities/getGMTDateTime";
import loadTFJSBackend from "../../utilities/loadTFJSBackend";

//Loading spinner icon that appears during fetch requests
import { TailSpin } from "react-loader-spinner";

//NPM package that implements a floating React element that gives information to the user
import { Tooltip as ReactTooltip } from "react-tooltip";

//Icons used throughout the selfie page https://react-icons.github.io/react-icons/
import { BiReset, BiArrowFromLeft, BiArrowFromRight } from "react-icons/bi";
import { MdAddAPhoto, MdOutlineDeleteOutline } from "react-icons/md";
import { IoCreateOutline, IoAlertCircleOutline } from "react-icons/io5";
import { FaRegImages } from "react-icons/fa";

//Defined structure of a faceDetection object outputted by faceapi.js
type faceDetectionObject = {
	_height: number;
	_width: number;
	_x: number;
	_y: number;
};

//Defined structure of a Selfie Object
type Selfie = {
	_id?: string;
	selfieNumber?: number;
	selfieImageName: string;
	selfieImagePath: string;
	manualPrediction?: boolean;
	createdAt?: Date;
	stressStatus: "" | "Stressed" | "Not Stressed";
	stressProb: string;
};

export const MoodSelfieTFJS = () => {
	//---States---//
	//---Selfie Related States---//
	//Holds the dataURL of the selfie image
	const [selfieSrc, setSelfieSrc] = useState<string>("");
	//Array that holds all selfies in the database - each entry must follow the defined Selfie Type
	const [selfieArray, setSelfieArray] = useState<Selfie[]>([]);
	//Array that holds filtered selfies in an array based on user search in search bar
	const [filteredSelfieArray, setFilteredSelfieArray] = useState<Selfie[]>([]);
	//State that holds dates of selfies taken on a specific date
	const [selfiesTodayArray, setSelfiesTodayArray] = useState<string[]>([]);
	//Stores the database id of a currently selected selfie
	const [currentSelfieID, setCurrentSelfieID] = useState<string>("");
	//Stores an assigned number to a selfie image
	const [selfieNumber, setSelfieNumber] = useState<number>(0);
	//Bool state to determine if a selfie has been submitted to the database or not
	const [selfieSubmitted, setSelfieSubmitted] = useState<boolean>(false);
	//State to determine if a selfie should be deleted or not during the form submit event
	const [deleteSelfie, setDeleteSelfie] = useState<boolean>(false);
	//State to determine if a selfie is being edited or not during the form submit event
	const [editSelfie, setEditSelfie] = useState<boolean>(false);

	//---Video and Face Detection Related States---//
	//videoConnection monitors if the child Video component is connected or not
	const [videoConnection, setVideoConnection] = useState<boolean>(false);
	//State controls whether face-api's face detection hook should run or not
	const [faceDetectionRunning, setFaceDetectionRunning] = useState<boolean>(false);
	//State holds the coordinates of the face detected by face-api inside of the Video component
	const [faceDetectionCoordinates, setFaceDetectionCoordinates] = useState<faceDetectionObject>();

	//---Stress Prediction Model Related States---//
	//Holds the Selfie CNN model
	const [model, setModel] = useState<any>();
	//Holds the predicted stress made by the Selfie CNN model
	const [stressStatus, setStressStatus] = useState<"" | "Stressed" | "Not Stressed">("");
	//Holds the probability of the prediction made by the Selfie CNN model
	const [stressProb, setStressProb] = useState<string>("");

	//---Date and Time Related States---//
	//State that stores the current date and time
	const [dateGMT, setDateGMT] = useState<string>(getGMTDateTime().toISOString().slice(0, 19));
	//State that determines whether current date and time should be updated every second
	const [intervalRunning, setIntervalRunning] = useState<boolean>(true);

	//---UI Related States---//
	//Show old selfies table or not
	const [showOldSelfies, setShowOldSelfies] = useState<boolean>(false);
	//Viewing an old selfie or not
	const [viewingOldSelfie, setViewingOldSelfie] = useState<boolean>(false);
	//State to show/hide loading spinner based on fetch request completion
	const [loading, setLoading] = useState<boolean>(false);
	//State that holds an error message telling that user that no more previous/next selfies exist
	const [prevNextErrorMessage, setPrevNextErrorMessage] = useState<string>("");

	//---Dialog States - used by the imported Dialog component---//
	const [dialogShow, setDialogShow] = useState<boolean>(false);
	const [dialogHeader, setDialogHeader] = useState<string>("");
	const [dialogConfirmation, setDialogConfirmation] = useState<"confirmation" | "understand" | "manualPrediction">("confirmation");

	//---Refs---//
	const videoRef = useRef<HTMLVideoElement | null>(null);
	//Ref to canvas that is overlaid on top of the child Video component
	//Used to draw face-api's face detection, and then to extract a facial image from the canvas based on the coordinates of the detection
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const SelfieTableRef = useRef<HTMLTableElement>(null);
	const prevSelfieBtnRef = useRef<HTMLButtonElement>(null);
	const nextSelfieBtnRef = useRef<HTMLButtonElement>(null);

	//---Use Effects---//
	//Calls getAllSelfies() when selfie page is mounted
	useEffect(() => {
		getAllSelfies();
	}, []);

	//Automatically sets the selfie number based on how many selfies the selfieArray contains
	useEffect(() => {
		setSelfieNumber(selfieArray.length + 1);
	}, [selfieArray]);

	//Gets the current date and time every second - effectively acting as a realtime clock
	//Only runs if the user is taking a new selfie
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

		//Cleanup function to prevent memory leaks when the intervalRunning state is false
		return () => clearInterval(interval);
	}, [intervalRunning]);

	//useEffect hook loads the Selfie CNN model as soon as the page mounts
	useEffect(() => {
		const fetchSelfieModel = async () => {
			await loadTFJSBackend;

			console.log(tfjs.getBackend());

			//Load the CNN selfie model that is stored on the server-side
			const model = await tfjs.loadLayersModel("https://tpd20seu.projects.cmp.uea.ac.uk/selfie/models/tfjsCNNV3-OS-Epoch-100/model.json");
			setModel(model);
			console.log("Fetch CNN Selfie Model completed :)");
		};

		fetchSelfieModel();
	}, []);

	//useEffect hook used to load face-api when the child Video component is connected to the device's camera
	useEffect(() => {
		if (videoConnection == true) {
			const loadModels = async () => {
				try {
					await Promise.all([
						//Retrieve face-api from public directory
						faceapi.nets.tinyFaceDetector.loadFromUri("./face-api-models"),
					]);

					console.log("Face-Api.js models loaded successfully from ./face-api-models");

					setFaceDetectionRunning(true);
				} catch (error) {
					console.error(error);
				}
			};

			loadModels();
		} else {
			setFaceDetectionRunning(false);
		}
	}, [videoConnection]);

	//useEffect hook to turn off face detection when selfieSrc is not empty or when viewing old selfies
	useEffect(() => {
		if (selfieSrc != "" || showOldSelfies === true) {
			setFaceDetectionRunning(false);
		}
	}, [selfieSrc]);

	//used to see how many selfies where taken on a specific date - only done when viewing old selfies
	//the selfiesTodayArray stores these selfies
	useEffect(() => {
		if (viewingOldSelfie) {
			let tempArray: string[] = [];
			for (const selfie of selfieArray) {
				if (selfie.createdAt != null) {
					//if dateGMT (yyyy-mm-dd) === selfie.createdAt (yyyy-mm-dd) then add it to tempArray
					if (dateGMT.slice(0, 10) === selfie.createdAt.toString().slice(0, 10)) {
						tempArray.push(selfie.createdAt.toString().slice(0, 19));
					}
				}
			}
			setSelfiesTodayArray(tempArray);
		}
	}, [dateGMT]);

	//useEffect hook to run face-api's face detection model over the child Video component
	useEffect(() => {
		let interval: number | NodeJS.Timeout = 0;

		if (faceDetectionRunning) {
			//Set up the interval when the component mounts
			interval = setInterval(async () => {
				if (canvasRef.current && videoRef.current) {
					const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());

					if (detections != undefined) {
						setFaceDetectionCoordinates(detections[0]["_box"]);
					}

					//Create canvas that holds face-api's face detection
					const faceDetectionCanvas = faceapi.createCanvasFromMedia(videoRef.current);

					//Clear existing canvas children to prevent crashes
					canvasRef.current.innerHTML = "";

					canvasRef.current.appendChild(faceDetectionCanvas);

					//.matchDimensions() ensures that the dimension of faceDetectionCanvas are the same as canvasRef
					faceapi.matchDimensions(canvasRef.current, {
						width: 1280,
						height: 720,
					});

					//.resizeResults() resized face-api detection results to be the same as canvasRef ensuring that detections are overlaid over the user's face
					const resizedDetections = faceapi.resizeResults(detections, {
						width: 1280,
						height: 720,
					});

					//Finally, this line draws the results of the detection onto faceDetectionCanvas
					faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
				}
			}, 100);
		}

		//Clean up the interval when the component unmounts or when faceDetectionRunning is false
		return () => clearInterval(interval);
	}, [faceDetectionRunning]);

	//useEffect hook to call the predictStress() function upon the setting of the selfieSrc state
	useEffect(() => {
		if (!viewingOldSelfie) {
			//Set a timeout to call predictStress after 250 milliseconds
			//This is to avoid errors with React asynchronous state changes and function calls
			const timeoutId = setTimeout(() => {
				if (selfieSrc !== "") {
					predictStress();
				}
			}, 100);

			//Clean up the timeout when the component unmounts or when selfieSrc changes
			return () => clearTimeout(timeoutId);
		}
	}, [selfieSrc]);

	//---Functions---//
	//Asynchronous function to get all selfies from the database
	async function getAllSelfies(): Promise<void> {
		setLoading(true);
		const selfieResponse = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/selfie", {
			method: "Get",
			credentials: "include",
		});
		const selfies: Selfie[] = await selfieResponse.json();

		if (Array.isArray(selfies) && selfies.length != 0) {
			let counter: number = 1;

			//for loop to append a selfieNumber field and to convert the filepath of a selfie to a URI encoded format
			for (let selfie of selfies) {
				selfie["selfieNumber"] = counter;
				//Trim the "../selfieImages/" from the path
				const trimmedPath = selfie.selfieImagePath.split("/")[2];
				selfie.selfieImagePath = encodeURIComponent(trimmedPath);
				counter += 1;
			}

			//if resolved promise is an array that contains an object with a key "selfieNumber"
			if (Array.isArray(selfies) && selfies[0].hasOwnProperty("selfieNumber")) {
				setSelfieArray(selfies);
				setFilteredSelfieArray(selfies);
			}
		} else {
			setSelfieArray([]);
			setFilteredSelfieArray([]);
		}
		setLoading(false);
	}

	//Asynchronous function to send a delete selfie request to the server
	async function deleteSelfieFromDatabase(): Promise<void> {
		await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/${currentSelfieID}`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});

		console.log(`DELETE request with selfie #'${selfieNumber}' was sent successfully to the server!`);

		setDialogHeader(`Selfie #${selfieNumber} has been deleted!`);
		setDialogConfirmation("understand");
		setDialogShow(true);
	}

	//Asynchronous function to handle fetch requests
	async function handleSelfieFormSubmit(event: FormEvent): Promise<void> {
		event.preventDefault();

		//if user is deleting an existing selfie
		if (deleteSelfie && viewingOldSelfie) {
			await deleteSelfieFromDatabase();
			return;
		}

		const formData = new FormData();
		let status: string = stressStatus;
		let prob: string = stressProb;
		let manualPrediction: "true" | "false" = "false";

		if (editSelfie) {
			let test = await predictStress();
			if (test != undefined) {
				status = test[0];
				prob = test[1];
			}
		}

		if (dialogConfirmation === "manualPrediction") {
			if (stressStatus === "Stressed") {
				status = "Not Stressed";
			} else {
				status = "Stressed";
			}
			prob = "100%";
			manualPrediction = "true";
		}

		//Convert base64 selfie into a blob format
		const base64 = await fetch(selfieSrc, {
			credentials: "include",
		});
		const blob = await base64.blob();

		const currentDateTime: string = getGMTDateTime().toISOString();

		formData.append("stressStatus", status);
		formData.append("stressProb", prob);
		formData.append("manualPrediction", manualPrediction);

		//if user is taking a new selfie
		if (!deleteSelfie && !viewingOldSelfie) {
			const selfieFileName: string = `${currentDateTime} ${status}.jpg`;
			formData.append("selfieImageName", selfieFileName);
			formData.append("selfieImage", blob, selfieFileName);
			formData.append("createdAt", currentDateTime);

			await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/selfie", {
				method: "POST",
				body: formData,
				credentials: "include",
			});

			if (manualPrediction === "true") {
				await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/selfie/retraining", {
					method: "POST",
					body: formData,
					credentials: "include",
				});
			}

			console.log(`POST request with selfie '${selfieNumber}' was sent successfully to the server!`);

			setDialogHeader(
				`Selfie #${selfieNumber} was successfully submitted!\n\nOur model has marked the selfie as ${status} with a probability of ${prob}`
			);
		}
		//if user is manually editing the stress status of a selfie
		else if (!deleteSelfie && viewingOldSelfie) {
			let currentSelfie = undefined;

			for (const selfie of selfieArray) {
				if (selfie._id === currentSelfieID) {
					currentSelfie = selfie;
					break;
				}
			}

			const selfieFileName: string = `${currentSelfie?.createdAt} ${status}.jpg`;

			formData.append("selfieImageName", selfieFileName);
			formData.append("selfieImage", blob, `${currentSelfie?.createdAt} ${status}.jpg`);

			const object: { [key: string]: string } = {};
			formData.forEach((value: FormDataEntryValue, key: string) => {
				if (typeof value === "string") {
					object[key] = value;
				}
			});

			if (manualPrediction === "true") {
				await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/retraining/${currentSelfieID}`, {
					method: "PATCH",
					body: formData,
					credentials: "include",
				});
			}

			await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/${currentSelfieID}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(object),

				credentials: "include",
			});

			console.log(`PATCH request with selfie #${selfieNumber} was sent successfully to the server!`);

			setDialogHeader(
				`Selfie #${selfieNumber}' has been edited successfully!\n\nOur model has marked the entry as ${status} with a probability of ${prob}`
			);
		}

		setDialogConfirmation("understand");
		setDialogShow(true);
	}

	//Function to capture a selfie of the user based on face-api's face detection
	function captureSelfie(): void {
		if (canvasRef.current) {
			//Access the inner canvas (faceDetectionCanvas) of canvasRef the using children property
			const faceDetectionCanvas = canvasRef.current.children[0];

			if (faceDetectionCanvas instanceof HTMLCanvasElement) {
				const canvasContext = faceDetectionCanvas.getContext("2d");
				const coordinates = faceDetectionCoordinates;

				if (canvasContext && coordinates != undefined) {
					//Create a new canvas with dimensions based on the face-api detection box coordinates
					const croppedFaceDetectionCanvas = document.createElement("canvas");
					croppedFaceDetectionCanvas.width = coordinates._width;
					croppedFaceDetectionCanvas.height = coordinates._height;

					const croppedCanvasContext = croppedFaceDetectionCanvas.getContext("2d");

					if (croppedCanvasContext) {
						//Draw the cropped face detection onto the new canvas
						//The canvas is additionally cropped to remove as much background as possible while keep the face
						croppedCanvasContext.drawImage(
							faceDetectionCanvas,
							coordinates._x + 30,
							coordinates._y + 30,
							coordinates._width - 50,
							coordinates._height - 50,
							0,
							0,
							coordinates._width,
							coordinates._height
						);

						//Convert the canvas to a dataURL
						const dataURL = croppedFaceDetectionCanvas.toDataURL("image/png");
						setSelfieSrc(dataURL);
					}
				}
			}
		}
	}

	//Async function to convert the base64 image to a fully loaded HTMLImageElement as required by TensorFlow.js
	async function convertBase64ToImgObject(): Promise<HTMLImageElement> {
		const base64 = await fetch(selfieSrc, {
			credentials: "include",
		});

		const blob = await base64.blob();

		const imgUrl = URL.createObjectURL(blob);

		const img = new Image();

		img.src = imgUrl;

		//Return a promise that resolves when the image is fully loaded
		return new Promise((resolve, reject) => {
			img.onload = () => {
				resolve(img);
			};
			img.onerror = (error) => {
				reject(error);
			};
		});
	}

	//Function to convert selfieSrc into a HTMLImageElement as required by TensorFlow.js
	function convertToImgObject(): HTMLImageElement {
		const img = new Image();

		img.src = selfieSrc;

		return img;
	}

	//Simple function to return the higher number in an array of two numbers
	function argmax(array: [number, number]): number {
		if (array[0] > array[1]) {
			return 0;
		} else {
			return 1;
		}
	}

	//Function for predicting stress using the Selfie CNN model and TenorFlow.js
	async function predictStress() {
		try {
			let processedSelfie = undefined;
			//Calls a JavaScript image processing function to process the user's selfie into a format compatible with the Selfie CNN model
			//Had to move processing code to pure JavaScript as I could not get it to work with React and TypeScript despite hours of trying
			if (!viewingOldSelfie) {
				processedSelfie = imageProcessing(convertToImgObject());
			} else {
				const img = await convertBase64ToImgObject();
				processedSelfie = imageProcessing(img);
			}

			//Predict the stress level of the user's selfie using the Selfie CNN model and TenorFlow.js
			const prediction = model.predict(processedSelfie);
			console.log("prediction = ");
			console.log(prediction);

			//Extract probability scores of the prediction by converting the tensor into a regular array
			const scores = prediction.arraySync()[0];
			console.log("scores =");
			console.log(scores);

			//scores stores two prediction numbers in an array equal to 1
			//argmax is called to extract the higher prediction which will either be point towards the selfie being "Stressed" or "Not Stressed"
			const predictedClass = argmax(scores);

			let status = "";
			let proba = "";

			if (predictedClass === 1) {
				console.log(`Stressed: ${scores[1]}`);
				setStressStatus("Stressed");
				const prob = scores[1].toString();
				setStressProb(`${(prob * 100).toFixed(2)}%`);
				status = "Stressed";
				proba = `${(prob * 100).toFixed(2)}%`;
			} else {
				console.log(`Not Stressed: ${scores[0]}`);
				setStressStatus("Not Stressed");
				const prob = scores[0].toString();
				setStressProb(`${(prob * 100).toFixed(2)}%`);
				status = "Not Stressed";
				proba = `${(prob * 100).toFixed(2)}%`;
			}

			if (editSelfie) {
				return [status, proba];
			}

			console.log("Predicted Class:", predictedClass);
		} catch (error) {
			console.log("error occurred");
			console.error("Error:", error);
		}
	}

	//Function that handles searching the table. Table will update based on user search
	function search(event: React.ChangeEvent<HTMLInputElement>) {
		const searchTerm = event.target.value.trim();
		if (searchTerm === "") {
			setFilteredSelfieArray([]);
			setFilteredSelfieArray(selfieArray);
		} else {
			setFilteredSelfieArray([]);
			const tempArray: Selfie[] = selfieArray.filter((selfie) => {
				return selfie.selfieNumber?.toString().includes(searchTerm.toLowerCase());
			});
			setFilteredSelfieArray(tempArray);
		}
	}

	//Function that loads in the selfie selected by the user form the old selfies table
	function handleSelfieTableRowClick(event: React.MouseEvent<HTMLTableRowElement>) {
		for (const selfie of selfieArray) {
			if (selfie._id === event.currentTarget.id && selfie.selfieNumber) {
				setCurrentSelfieID(event.currentTarget.id);
				setSelfieNumber(selfie.selfieNumber);
				setStressStatus(selfie.stressStatus);
				setStressProb(selfie.stressProb);
				setSelfieSrc(`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/selfieImages/${selfie.selfieImagePath}`);
				setIntervalRunning(false);
				if (selfie.createdAt != null) {
					setDateGMT(selfie.createdAt.toString().slice(0, 19));
				}
				setViewingOldSelfie(true);
				setPrevNextErrorMessage("");
				setSelfieSubmitted(true);
				setShowOldSelfies(false);
				break;
			}
		}
	}

	//Function for cycling through previous and next selfies using prev/next buttons
	function prevNextSelfie(direction: "prev" | "next"): void {
		if (!prevSelfieBtnRef.current || !nextSelfieBtnRef.current) {
			return;
		}

		//get index of current selfie in the selfieArray
		let index: number = 0;

		for (const selfie of selfieArray) {
			if (selfie._id === currentSelfieID) {
				index = selfieArray.indexOf(selfie);
				break;
			}
		}

		let prevNextSelfie: Selfie | undefined = undefined;

		if (direction === "prev") {
			if (selfieArray[index - 1] === undefined) {
				setPrevNextErrorMessage("No more previous selfies exist!");
				prevSelfieBtnRef.current.disabled = true;
			} else {
				prevNextSelfie = selfieArray[index - 1];
				prevSelfieBtnRef.current.disabled = false;
				nextSelfieBtnRef.current.disabled = false;
			}
		} else if (direction === "next") {
			if (selfieArray[index + 1] === undefined) {
				setPrevNextErrorMessage("No more following selfies exist!");
				nextSelfieBtnRef.current.disabled = true;
			} else {
				prevNextSelfie = selfieArray[index + 1];
				nextSelfieBtnRef.current.disabled = false;
				prevSelfieBtnRef.current.disabled = false;
			}
		}

		if (prevNextSelfie && prevNextSelfie.selfieNumber && prevNextSelfie._id) {
			setPrevNextErrorMessage("");

			setSelfieNumber(prevNextSelfie.selfieNumber);
			setCurrentSelfieID(prevNextSelfie._id);
			setSelfieSrc(`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/selfieImages/${prevNextSelfie.selfieImagePath}`);
			setStressStatus(prevNextSelfie.stressStatus);
			setStressProb(prevNextSelfie.stressProb);
			if (prevNextSelfie.createdAt != undefined) {
				setDateGMT(prevNextSelfie.createdAt.toString().slice(0, 19));
			}
		}
	}

	//Function to reset states to their original values
	function reset() {
		setSelfieNumber(selfieArray.length + 1);
		setStressStatus("");
		setStressProb("");
		setSelfieSrc("");
		setDeleteSelfie(false);
		setEditSelfie(false);
		setDialogConfirmation("confirmation");
		setIntervalRunning(true);
		setViewingOldSelfie(false);
		setSelfieSubmitted(false);
		setShowOldSelfies(false);
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
					<h1>Mood Selfie</h1>
					<p className="infoP">Snap a selfie of your face to determine your current mood!</p>
					<p className="infoP">The selfie model will make stress predictions in the browser on your device.</p>
					<p className="infoP" id="lookIntoCameraP">
						<b>*Please look into the camera and make try to use good lighting when taking a selfie for best results :)</b>
					</p>

					<hr />

					{!showOldSelfies && (
						<form id="selfieForm" onSubmit={handleSelfieFormSubmit}>
							<ReactTooltip id="connectCameraTooltip" place="top" content="Please connect your device's camera" />
							<ReactTooltip id="takeSelfieTooltip" place="top" content="You must take a selfie first" />
							<ReactTooltip id="resetSelfieTooltip" place="top" content="Please click 'Reset' to take another selfie" />
							<ReactTooltip id="selfieNotSubmitted" place="top" content={"This selfie has not been submitted yet"} />
							<ReactTooltip id="manualPredictionTooltip" place="top" content="Click here if the stress prediction of this selfie is incorrect" />

							<Dialog
								header={dialogHeader}
								dialogShow={dialogShow}
								dialogConfirmation={dialogConfirmation}
								// onConfirm is tied to a submit button which triggers the form's onSubmit event
								onConfirm={() => {
									setDialogShow(false);
								}}
								onCancel={() => {
									setDialogShow(false);
								}}
								onUnderstand={() => {
									reset();
									//update selfieArray following request
									getAllSelfies();
									setDialogShow(false);
								}}
								onManualPrediction={() => {
									setDialogShow(false);
								}}
							/>

							<div id="selfieModeContainer">
								{viewingOldSelfie ? <h2>View, Edit, or Delete Old Selfie</h2> : <h2>Take New Selfie</h2>}
								{stressStatus !== "" && stressProb !== "" && (
									<div
										id="manualPredictionContainer"
										data-tooltip-id={"manualPredictionTooltip"}
										onClick={() => {
											setDialogHeader(
												"If you believe that our model has made an incorrect prediction on your selfie, please click the confirm button.\n\nYour selfie will be marked with the correct stress status and this selfie will be used to help train our model in the future."
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

							<div id="selfieTopTitleContainer">
								<label id="selfieNumberLbl" htmlFor="Title">
									{selfieSubmitted && <h3 id="selfieSubmittedH3">Selfie Number: {selfieNumber}</h3>}
									{!selfieSubmitted && (
										<h3 id="selfieNotSubmittedH3" data-tooltip-id="selfieNotSubmitted">
											Selfie Number: {selfieNumber}*
										</h3>
									)}
								</label>

								<div id="dateLbl">{dateGMT.replace("T", "\n")}</div>

								<label id="stressLbl">
									{stressStatus === "" || stressProb === "" ? (
										<h3>Stress Status Unknown</h3>
									) : (
										<h3 id={stressStatus === "Stressed" ? "stressed" : "notStressed"}>{`${stressStatus} - ${stressProb}`}</h3>
									)}
								</label>
							</div>

							<div id="selfieTopControlsContainer">
								{!viewingOldSelfie && (
									<>
										<button
											type="button"
											id="resetSelfieBtn"
											className="selfieTopControlBtn"
											onClick={() => {
												setSelfieSrc("");
												setStressStatus("");
												setStressProb("");
											}}
											disabled={selfieSrc === ""}
											data-tooltip-id={videoConnection === false ? "connectCameraTooltip" : selfieSrc === "" ? "takeSelfieTooltip" : ""}
										>
											Reset
											<BiReset id="selfieResetBtnIcon" className="selfieControlBtnIcon" />
										</button>

										<button
											type="button"
											id="takeSelfieBtn"
											className="selfieTopControlBtn"
											onClick={() => {
												captureSelfie();
											}}
											disabled={videoConnection === false || selfieSrc != ""}
											data-tooltip-id={videoConnection === false ? "connectCameraTooltip" : selfieSrc != "" ? "resetSelfieTooltip" : ""}
										>
											Take Selfie
											<MdAddAPhoto id="takeSelfieBtnIcon" className="selfieControlBtnIcon" />
										</button>

										<button
											type="button"
											id="submitSelfieBtn"
											className="selfieTopControlBtn"
											onClick={(event) => {
												event.preventDefault();
												setDialogHeader("Are you sure you want to submit this selfie?");
												setDeleteSelfie(false);
												setDialogShow(true);
											}}
											disabled={selfieSrc === ""}
											data-tooltip-id={videoConnection === false ? "connectCameraTooltip" : selfieSrc === "" ? "takeSelfieTooltip" : ""}
										>
											Submit Selfie
											<IoCreateOutline id="selfieSubmitBtnIcon" className="selfieControlBtnIcon" />
										</button>
									</>
								)}

								{viewingOldSelfie && (
									<>
										<button
											type="button"
											id="predictSelfieStressBtn"
											className="selfieTopControlBtn"
											onClick={(event) => {
												event.preventDefault();
												setDialogHeader("Are you sure you want to re-predict and submit this selfie?");
												setDeleteSelfie(false);
												setEditSelfie(true);
												setDialogShow(true);
												// predictStress();
											}}
										>
											Re-Predict Stress
											<MdAddAPhoto id="takeSelfieBtnIcon" className="selfieControlBtnIcon" />
										</button>
										<button
											type="button"
											id="deleteSelfieBtn"
											className="selfieTopControlBtn"
											onClick={(event) => {
												event.preventDefault();
												setDialogHeader("Are you sure you want to delete this selfie?");
												setDeleteSelfie(true);
												setDialogShow(true);
											}}
										>
											Delete Selfie <MdOutlineDeleteOutline id="deleteSelfieBtnIcon" className="selfieControlBtnIcon" />
										</button>
									</>
								)}
							</div>

							<div id="videoCanvasContainer">
								{selfieSrc === "" ? (
									<div id="videoContainer">
										<Video
											id="video"
											videoRef={videoRef}
											videoHeight={720}
											videoWidth={1280}
											videoConnected={videoConnection}
											videoChange={() => {
												setVideoConnection((videoConnection) => !videoConnection);
											}}
										/>
										{videoConnection && <Canvas id="canvas" canvasRef={canvasRef} canvasHeight={720} canvasWidth={1280}></Canvas>}
									</div>
								) : (
									<img id="selfie" src={selfieSrc} alt="Take Selfie" />
								)}
							</div>

							<div id="selfieBottomContainer">
								{viewingOldSelfie && (
									<h3 id="selfieNumberLbl">
										Selfies taken this day: {selfiesTodayArray.indexOf(dateGMT) + 1}/{selfiesTodayArray.length}
									</h3>
								)}

								<div id="selfieBottomControlsContainer">
									{viewingOldSelfie && (
										<>
											<button
												type="button"
												id="takeNewSelfieBtn"
												className="selfieBottomControlBtn"
												onClick={() => {
													reset();
												}}
											>
												Take New Selfie
												<MdAddAPhoto id="takeNewSelfieBtnIcon" className="selfieControlBtnIcon" />
											</button>

											<button
												type="button"
												id="selfiePrevEntryBtn"
												ref={prevSelfieBtnRef}
												className="selfieBottomControlBtn"
												onClick={() => {
													prevNextSelfie("prev");
												}}
											>
												<BiArrowFromRight id="selfiePrevBtnIcon" className="selfieControlBtnIcon" />
												Prev Selfie
											</button>

											<button
												type="button"
												id="selfieNextEntryBtn"
												ref={nextSelfieBtnRef}
												className="selfieBottomControlBtn"
												onClick={() => {
													prevNextSelfie("next");
												}}
											>
												Next Selfie
												<BiArrowFromLeft id="selfieNextBtnIcon" className="selfieControlBtnIcon" />
											</button>
										</>
									)}

									<button
										type="button"
										id="showOldSelfiesBtn"
										className="selfieBottomControlBtn"
										onClick={() => {
											setViewingOldSelfie(false);
											setIntervalRunning(false);
											setShowOldSelfies(true);
										}}
									>
										View Old Selfies
										<FaRegImages id="showOldSelfiesIcon" className="selfieControlBtnIcon" />
									</button>
								</div>

								{viewingOldSelfie && <p id="prevNextErrorMessageP">{prevNextErrorMessage}</p>}
							</div>
						</form>
					)}
					{showOldSelfies && (
						<div id="showOldSelfiesContainer">
							<table id="showOldSelfiesTable" ref={SelfieTableRef}>
								<caption>
									<div id="showOldSelfiesTitleContainer">
										<h2 id="showOldSelfiesTitleH2">
											Your Old Selfies <FaRegImages />
										</h2>
										<SearchBar
											placeholder="Search table by selfie number..."
											onChange={(event) => {
												search(event);
											}}
										/>
									</div>
								</caption>
								<thead>
									<tr>
										<th>Selfie Number</th>
										<th>Selfie Image</th>
										<th>Date - Time</th>
										<th>Stress</th>
									</tr>
								</thead>
								<tbody>
									{selfieArray.length !== 0 && (
										<>
											{filteredSelfieArray.map((selfie: Selfie, index) => (
												<tr
													key={index}
													id={`${selfie._id}`}
													className="selfieTableRow"
													onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
														handleSelfieTableRowClick(event);
													}}
												>
													<td data-cell="Selfie Number" className="selfieNumberCell">
														{selfie.selfieNumber}
													</td>
													<td data-cell="Selfie Image">
														<img
															className="selfieImg"
															loading="lazy"
															src={`https://tpd20seu.projects.cmp.uea.ac.uk/selfie/selfieImages/${selfie.selfieImagePath}`}
															alt="Image"
														></img>
													</td>
													<td data-cell="Selfie Datetime">{`${selfie.createdAt?.toString().slice(0, 10)} - ${selfie.createdAt
														?.toString()
														.slice(11, 19)}`}</td>
													<td
														data-cell="Selfie Stress"
														className={selfie.stressStatus === "Stressed" ? "stressedCell" : "notStressedCell"}
													>{`${selfie.stressStatus} - ${selfie.stressProb}`}</td>
												</tr>
											))}
											{filteredSelfieArray.length === 0 && (
												<tr>
													<td id="noMatchingSearchTermTR" colSpan={4}>
														No selfie numbers matching the searched term were found :/
													</td>
												</tr>
											)}
										</>
									)}
								</tbody>
							</table>

							{selfieArray.length === 0 && <h3 id="noExistingSelfiesH3">There are no existing selfies in our database :/</h3>}

							<div id="showOldSelfiesBottomContainer">
								<button
									type="button"
									id="takeNewSelfieBtn"
									className="selfieBottomControlBtn"
									onClick={() => {
										reset();
									}}
								>
									Take New Selfie
									<MdAddAPhoto id="takeNewSelfieBtnIcon" />
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
};
