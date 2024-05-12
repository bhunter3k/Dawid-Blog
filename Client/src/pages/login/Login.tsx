import { useState, useEffect, FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";

//Loading spinner icon that appears during fetch requests
import { TailSpin } from "react-loader-spinner";

//TensorFlow.js is used to make predictions using my trained CNN selfie model in the browser
import * as tfjs from "@tensorflow/tfjs";

//Defined structure of a User Object
type User = {
	_id: string;
	tfjsCompatible: "true" | "false" | "not tested";
};

export const Login = () => {
	//---States---//
	const [consented, setConsented] = useState<boolean>(true);
	const [username, setUsername] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [validLoginDetails, setValidLoginDetails] = useState<boolean>(true);
	//Hold the user's information (without any private information e.g., password)
	const [user, setUser] = useState<User>();
	//State to show/hide loading spinner based on fetch request completion
	const [loading, setLoading] = useState<boolean>(false);

	//---Variables---//
	//Holds the Journal BNNC model
	let journalModel: any;
	//Holds the Selfie CNN model
	let selfieModel: any;

	//---References---//
	const usernameTxtRef = useRef<HTMLInputElement>(null);
	const passwordTxtRef = useRef<HTMLInputElement>(null);
	const consentCBXRef = useRef<HTMLInputElement>(null);

	const navigate = useNavigate();

	useEffect(() => {
		if (user != null && user.tfjsCompatible === "not tested") {
			async function testTFJSCompatibility() {
				const setBackendResult = await setBackend();
				if (setBackendResult === false) {
					updateUserTFJSCompatibility(false);
					return;
				}

				console.log("setBackend test passed");

				const loadModelsResult = await loadModels();
				if (loadModelsResult === false) {
					updateUserTFJSCompatibility(false);
					return;
				}

				console.log("loadModels test passed");

				const testTFJSPredictionResult = await testTFJSPrediction();
				if (testTFJSPredictionResult === false) {
					updateUserTFJSCompatibility(false);
					return;
				}

				console.log("testTFJSPrediction test passed");

				updateUserTFJSCompatibility(true);
			}

			setLoading(true);
			testTFJSCompatibility();
		} else if (user != null && user.tfjsCompatible != "not tested") {
			navigate("/dashboardPage", { replace: true });
		}
	}, [user]);

	async function updateUserTFJSCompatibility(deviceTFJSCompatible: boolean) {
		if (user != null) {
			await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/user/${user._id}`, {
				method: "PATCH",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					tfjsCompatible: deviceTFJSCompatible.toString(),
				}),
			});

			if (deviceTFJSCompatible === true) {
				console.log("This device supports tfjs");
			} else if (deviceTFJSCompatible === false) {
				console.log("This device does not support tfjs. Instead a backend version will be used.");
			}

			setLoading(false);
			navigate("/dashboardPage", { replace: true });
		}
	}

	//Function to test predictions using the selfie and journal models to determine if user's device supports TensorFlow.js
	async function testTFJSPrediction() {
		try {
			//Testing selfie CNN model with TFJS
			const processedSelfieTensor = await fetch("/processedSelfieTensor.json");

			const processedSelfieTensorData = await processedSelfieTensor.json();

			const selfieTensor = tfjs.tensor(processedSelfieTensorData);

			const selfieCNNPrediction = selfieModel.predict(selfieTensor);

			const selfieCNNScores = selfieCNNPrediction.arraySync()[0];
			console.log("Selfie CNN Prediction Scores =");
			console.log(selfieCNNScores);

			//---------------------------------------------------------------------//

			//Testing journal BNNC model with TFJS
			const processedJournalTensor = await fetch("/processedJournalTensor.json");

			const processedJournalTensorData = await processedJournalTensor.json();

			const journalTensor = tfjs.tensor(processedJournalTensorData);

			const journalBNNCPrediction = journalModel.predict(journalTensor);

			const journalBNNCScores = journalBNNCPrediction.arraySync()[0];
			console.log("Journal BNNC Prediction Scores =");
			console.log(journalBNNCScores);

			return true;
		} catch (error) {
			console.log(error);
			return false;
		}
	}

	async function setBackend() {
		try {
			tfjs.setBackend("webgl");
			await tfjs.ready();
			console.log("WebGL backend is compatible");
			return true;
		} catch (error) {
			console.log("WebGL backend is not compatible:", error);
		}

		try {
			tfjs.setBackend("wasm");
			await tfjs.ready();
			console.log("WASM backend is compatible");
			return true;
		} catch (error) {
			console.log("WASM backend is not compatible:", error);
		}

		try {
			tfjs.setBackend("cpu");
			await tfjs.ready();
			console.log("CPU backend is compatible");
			return true;
		} catch (error) {
			console.log("CPU backend is not compatible:", error);
		}

		return false;
	}

	async function loadModels() {
		try {
			//Load the BNNC and CNN models that is stored on the server-side
			journalModel = await tfjs.loadLayersModel("https://tpd20seu.projects.cmp.uea.ac.uk/journal/models/TFJSBinaryNeuralNetworkClassifier/model.json");
			selfieModel = await tfjs.loadLayersModel("https://tpd20seu.projects.cmp.uea.ac.uk/selfie/models/tfjsCNNV3-OS-Epoch-100/model.json");

			if (journalModel && selfieModel) {
				console.log("Fetch of BNNC and CNN models completed :)");
				return true;
			} else {
				return false;
			}
		} catch (error) {
			console.log("Error while loading BNNC and CNN models:", error);
			return false;
		}
	}

	async function fetchCurrentUser() {
		const user = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/user/", {
			method: "GET",
			credentials: "include",
		});

		const userData = await user.json();

		setUser(userData);
	}

	async function handleLoginFormSubmit(event: FormEvent): Promise<void> {
		event.preventDefault();

		const login = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/user/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ username: username, password: password }),
		});

		const loginResponse = await login.status;

		if (loginResponse === 200) {
			setValidLoginDetails(true);
			fetchCurrentUser();
		} else {
			setValidLoginDetails(false);
		}
	}

	useEffect(() => {
		if (usernameTxtRef.current != null && passwordTxtRef.current != null) {
			if (validLoginDetails === false) {
				usernameTxtRef.current.style.color = "red";
				usernameTxtRef.current.style.border = "1px solid red";
				passwordTxtRef.current.style.color = "red";
				passwordTxtRef.current.style.border = "1px solid red";

				usernameTxtRef.current.value = "";
				passwordTxtRef.current.value = "";
			}
		}
	}, [validLoginDetails]);

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
					<h2>Testing device compatibility with website....</h2>
				</div>
			)}

			{!loading && (
				<div id="loginScreenContainer">
					<ReactTooltip id="usernameEmptyTooltip" place="top" content="You must enter a username" />
					<ReactTooltip id="passwordEmptyTooltip" place="top" content="You must enter a password" />
					<ReactTooltip
						id="consentWarningTooltip"
						place="top"
						content="You must read through the 'Important Information' section and check the consent checkbox"
					/>

					<form
						id="loginForm"
						onSubmit={(event) => {
							handleLoginFormSubmit(event);
						}}
					>
						<h2>Welcome to the "You Are Not Your Thoughts" website!</h2>
						<h3>Please enter the login details provided by the researcher Dawid Klos in the instructions email sent to you.</h3>

						<div id="notesContainer">
							<p>*Important Information:</p>
							<ul>
								<li>
									It is important that you understand that both the Journal and Selfie features will store your inputted entries/selfies on a
									secure database if you click the submit button.
								</li>
								<li>
									It is up to you if you wish to submit your entries/selfies. You will still be able to test both of the feature's machine
									learning models without submission.
								</li>
								<li>This login will keep the data you input during testing safe and only accessible by the researcher Dawid Klos.</li>
								<li>All of your data will be deleted and will not be used in the project report in any capacity.</li>
								<li>
									The sole goal of getting individuals to test the website is to collect feedback on features, get recommendations from
									testers, and to find any bugs missed during development.
								</li>
							</ul>
						</div>

						{!validLoginDetails && <p id="invalidLoginDetailsP">*Incorrect Login Details - Please try again</p>}

						<div id="usernameContainer" className="loginFieldContainer">
							<label htmlFor="username" id="usernameLbl" className="loginFieldLbl">
								Username:
							</label>
							<input
								type="text"
								id="usernameTxt"
								className="loginTxt"
								ref={usernameTxtRef}
								placeholder="Enter your username..."
								onChange={(event) => {
									setUsername(event.target.value);
								}}
							></input>
						</div>

						<div id="passwordContainer" className="loginFieldContainer">
							<label htmlFor="password" id="passwordLbl" className="loginFieldLbl">
								Password:
							</label>
							<input
								type="text"
								id="passwordTxt"
								className="loginTxt"
								ref={passwordTxtRef}
								placeholder="Enter your password..."
								onChange={(event) => {
									setPassword(event.target.value);
								}}
							></input>
						</div>

						<div id="checkBoxContainer" className="loginFieldContainer">
							<label htmlFor="checkbox">
								I have read through and understood the <u>'Important Information'</u> section and I consent to testing the website
							</label>
							<input
								type="checkbox"
								id="consentCBX"
								ref={consentCBXRef}
								onChange={() => {
									setConsented(!consented);
								}}
							></input>
						</div>

						<button
							type="submit"
							id="loginBtn"
							disabled={username === "" ? true : password === "" ? true : consented}
							data-tooltip-id={
								username === "" ? "usernameEmptyTooltip" : password === "" ? "passwordEmptyTooltip" : consented ? "consentWarningTooltip" : ""
							}
						>
							Login
						</button>
					</form>
				</div>
			)}
		</>
	);
};
