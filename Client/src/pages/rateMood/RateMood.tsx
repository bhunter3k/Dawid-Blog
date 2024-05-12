import { useState, useEffect, useRef, FormEvent } from "react";
import { SearchBar, Dialog } from "../../components";
import getGMTDateTime from "../../utilities/getGMTDateTime";
//Loading spinner icon that appears during fetch requests
import { TailSpin } from "react-loader-spinner";
//NPM package that implements a floating React element that gives information to the user
import { Tooltip as ReactTooltip } from "react-tooltip";

//https://react-icons.github.io/react-icons/
import { BiReset, BiSad, BiSmile, BiHappy } from "react-icons/bi";
import { CgSmileNeutral } from "react-icons/cg";
import { FaRegSadCry } from "react-icons/fa";
import { IoDocumentsOutline } from "react-icons/io5";

//Defined structure of a Rating Object
type Rating = {
	ratingNumber?: number;
	//_id, createdAt are optional
	_id?: string;
	moodRating: string;
	message: string;
	createdAt?: Date;
};

export const RateMood = () => {
	//---States---//
	//Bool state that determines whether to show the old ratings table or not
	const [viewOldRatings, setViewOldRatings] = useState<boolean>(false);
	//State that stores the current date and time
	const [dateGMT, setDateGMT] = useState<string>(getGMTDateTime().toISOString().slice(0, 19));
	//State that determines whether current date and time should be updated every second
	const [intervalRunning, setIntervalRunning] = useState<boolean>(true);
	//State to show/hide loading spinner based on fetch request completion
	const [loading, setLoading] = useState<boolean>(false);
	//Array that holds all ratings in the database - each entry must follow the defined Rating Type
	const [ratingArray, setRatingArray] = useState<Rating[]>([]);
	//Array that holds filtered ratings in an array based on user search in search bar
	const [filteredRatingArray, setFilteredRatingArray] = useState<Rating[]>([]);

	const [moodRating, setMoodRating] = useState<string>("");
	const [optionalMessage, setOptionalMessage] = useState<string>("");

	const [ratingSubmittedToday, setRatingSubmittedToday] = useState<boolean>(false);
	const [currentRatingID, setCurrentRatingID] = useState<string>("");

	//---Dialog States - used by the imported Dialog component---//
	const [dialogShow, setDialogShow] = useState<boolean>(false);
	const [dialogHeader, setDialogHeader] = useState<string>("");
	const [dialogAction, setDialogAction] = useState<"Delete" | "No Action">("No Action");
	const [dialogConfirmation, setDialogConfirmation] = useState<"confirmation" | "understand" | "manualPrediction">("confirmation");

	//---References---//
	const ratingTableRef = useRef<HTMLTableElement>(null);

	//calls getAllRatings() when rating page is mounted
	useEffect(() => {
		setIntervalRunning(true);
		getAllRatings();
	}, []);

	// useEffect(() => {
	// 	checkRatingSubmittedToday();
	// }, [ratingArray]);

	//gets the current date and time every second - effectively acting as a realtime clock
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

	//asynchronous function getting all ratings from the database
	async function getAllRatings(): Promise<void> {
		const ratingResponse = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/rating", {
			method: "Get",
			credentials: "include",
		});
		const ratings = await ratingResponse.json();

		if (Array.isArray(ratings) && ratings.length > 0) {
			let counter: number = 1;

			//for loop to append a ratingNumber field
			for (let rating of ratings) {
				rating["ratingNumber"] = counter;
				counter += 1;

				if (dateGMT.slice(0, 10) === rating.createdAt?.toString().slice(0, 10)) {
					setRatingSubmittedToday(true);
					if (rating._id != null && rating.message != "") {
						setCurrentRatingID(rating._id);
						setOptionalMessage(rating.message);
					}
				}
			}

			setRatingArray(ratings);
			setFilteredRatingArray(ratings);
		} else {
			setRatingArray([]);
			setFilteredRatingArray([]);
			setRatingSubmittedToday(false);
		}
	}

	//asynchronous function handling all submit events on journal form
	async function handleRatingFormSubmit(event: FormEvent): Promise<void> {
		event.preventDefault();

		setLoading(true);

		if (dialogAction === "Delete") {
			await fetch(`https://tpd20seu.projects.cmp.uea.ac.uk/rating/${currentRatingID}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});

			console.log(`DELETE request with rating was sent successfully to the server!`);

			setOptionalMessage("");
			setDialogHeader(`Rating has been deleted! You can now make a new mood rating :)`);
		} else {
			const newRating: Rating = {
				moodRating: moodRating,
				message: optionalMessage.trim(),
				createdAt: getGMTDateTime(),
			};

			await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/rating", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newRating),
				credentials: "include",
			});

			console.log(`POST request with rating '${newRating.moodRating}' was sent successfully to the server!`);

			setDialogHeader(`New rating '${newRating.moodRating}' has been created successfully!`);
		}

		//update ratingArray following request
		getAllRatings();

		setLoading(false);

		setDialogAction("No Action");
		setDialogConfirmation("understand");
		setDialogShow(true);
	}

	function handleIconBtnClick(event: React.MouseEvent<HTMLButtonElement>) {
		const currentBtn = event.target as HTMLElement;

		if (currentBtn.className === "iconBtn") {
			currentBtn.className = "iconBtnSelected";
		} else if (currentBtn.className === "iconBtnSelected") {
			currentBtn.className = "iconBtn";
		}

		const selectedRating = currentBtn.id;

		let dialogMessage: string = "";
		let selectedMood: string = "";

		if (selectedRating === "veryStressedBtn") {
			setMoodRating("Very Stressed");
			selectedMood = "Very Stressed";
		} else if (selectedRating === "mildlyStressedBtn") {
			setMoodRating("Mildly Stressed");
			selectedMood = "Mildly Stressed";
		} else if (selectedRating === "neutralBtn") {
			setMoodRating("Neutral");
			selectedMood = "Neutral";
		} else if (selectedRating === "mildlyPositiveBtn") {
			setMoodRating("Mildly Positive");
			selectedMood = "Mildly Positive";
		} else if (selectedRating === "veryPositiveBtn") {
			setMoodRating("Very Positive");
			selectedMood = "Mildly Positive";
		}

		if (optionalMessage === "") {
			dialogMessage = `You have selected "${selectedMood}" as your mood for today. Do you want to submit your rating?\n\nRemember that you can add an optional message! (Click cancel to do so)`;
		} else if (optionalMessage != "") {
			dialogMessage = `You have selected "${selectedMood}" as your mood for today. Do you want to submit your rating?`;
		}

		setDialogHeader(dialogMessage);
		setDialogShow(true);
	}

	function resetIconBtnSelectedClassName() {
		const selectedButton = document.querySelector(".iconBtnSelected") as HTMLButtonElement;

		if (selectedButton === null) {
			return;
		}

		selectedButton.className = "iconBtn";
	}

	//Function that handles searching the table. Table will update based on user search
	function search(event: React.ChangeEvent<HTMLInputElement>) {
		const searchTerm = event.target.value.trim();
		if (searchTerm === "") {
			setFilteredRatingArray([]);
			setFilteredRatingArray(ratingArray);
		} else {
			setFilteredRatingArray([]);
			const tempArray: Rating[] = ratingArray.filter((rating) => {
				return rating.ratingNumber?.toString().includes(searchTerm.toLowerCase());
			});
			setFilteredRatingArray(tempArray);
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
					<ReactTooltip id="manualPredictionTooltip" place="top" content="Click here if the stress prediction of this selfie is incorrect" />

					<h1>Rate Mood</h1>
					<h2>Select the icon that best represents your current mood!</h2>
					<p id="infoP">*You can only rate your mood once per day! However, you can undo your rating on the day if your mood changes.</p>

					<hr />

					<form id="rateMoodForm" onSubmit={handleRatingFormSubmit}>
						<Dialog
							header={dialogHeader}
							dialogShow={dialogShow}
							dialogConfirmation={dialogConfirmation}
							// onConfirm is tied to a submit button which triggers the form's onSubmit event
							onConfirm={() => {
								setDialogShow(false);
							}}
							onCancel={() => {
								resetIconBtnSelectedClassName();
								setDialogShow(false);
							}}
							onUnderstand={() => {
								resetIconBtnSelectedClassName();
								setDialogShow(false);
								setDialogConfirmation("confirmation");
							}}
							onManualPrediction={() => {
								setDialogShow(false);
							}}
						/>

						{!viewOldRatings && (
							<>
								<div id="headerContainer">
									<h2>Select your current mood!</h2>
									{ratingSubmittedToday && <p id="ratingSubmittedToday">A rating has already been submitted today</p>}
								</div>

								<div id="dateTimeContainer">
									<p id="dateTimeP">{dateGMT.replace("T", " ")}</p>
								</div>

								<div id="iconContainer">
									<button
										type="button"
										id="veryStressedBtn"
										className="iconBtn"
										onClick={(event) => {
											handleIconBtnClick(event);
										}}
										disabled={ratingSubmittedToday}
									>
										<FaRegSadCry className="ratingIcon" />
										Very Stressed
									</button>

									<button
										type="button"
										id="mildlyStressedBtn"
										className="iconBtn"
										onClick={(event) => {
											handleIconBtnClick(event);
										}}
										disabled={ratingSubmittedToday}
									>
										<BiSad className="ratingIcon" />
										Mildly Stressed
									</button>

									<button
										type="button"
										id="neutralBtn"
										className="iconBtn"
										onClick={(event) => {
											handleIconBtnClick(event);
										}}
										disabled={ratingSubmittedToday}
									>
										<CgSmileNeutral className="ratingIcon" />
										Neutral
									</button>

									<button
										type="button"
										id="mildlyPositiveBtn"
										className="iconBtn"
										onClick={(event) => {
											handleIconBtnClick(event);
										}}
										disabled={ratingSubmittedToday}
									>
										<BiSmile className="ratingIcon" />
										Mildly Positive
									</button>

									<button
										type="button"
										id="veryPositiveBtn"
										className="iconBtn"
										onClick={(event) => {
											handleIconBtnClick(event);
										}}
										disabled={ratingSubmittedToday}
									>
										<BiHappy className="ratingIcon" />
										Very Positive
									</button>
								</div>

								<div id="optionalMessageContainer">
									<textarea
										id="optionalMessageTxt"
										rows={2}
										maxLength={125}
										placeholder="Optional: Write a short message describing why you feel this way."
										value={optionalMessage}
										onChange={(event) => {
											setOptionalMessage(event.target.value);
										}}
										disabled={ratingSubmittedToday}
									></textarea>
								</div>

								<div id="viewOldRatingsContainer">
									<button
										type="button"
										id="viewOldRatingsBtn"
										className="ratingsBtn"
										onClick={() => {
											setViewOldRatings((prevState) => !prevState);
										}}
									>
										<IoDocumentsOutline className="ratingsBtnIcon" />
										View Old Ratings
									</button>

									<button
										type="button"
										id="undoRatingBtn"
										className="ratingsBtn"
										onClick={() => {
											setDialogAction("Delete");
											setDialogHeader("Warning: Today's mood rating will be deleted allowing you to make a new one.");
											setDialogShow(true);
										}}
									>
										Undo Today's Rating
										<BiReset className="ratingsBtnIcon" />
									</button>
								</div>
							</>
						)}
					</form>

					{viewOldRatings && (
						<>
							<div id="oldRatingsContainer">
								<table id="oldRatingsTable" ref={ratingTableRef}>
									<caption>
										<div id="oldRatingsTitleContainer">
											<h2 id="oldRatingsTitleH2">
												Your Old Ratings <IoDocumentsOutline id="ratingsBtnIcon" />
											</h2>
											<SearchBar
												placeholder="Search table by ratings number..."
												onChange={(event) => {
													search(event);
												}}
											/>
											{filteredRatingArray.length === 0 && <p>No entry titles matching the searched term were found :/</p>}
										</div>
									</caption>
									<thead>
										<tr>
											<th>Rating Number</th>
											<th>Date Time</th>
											<th>Mood Rating</th>
											<th>Message</th>
										</tr>
									</thead>
									<tbody>
										{ratingArray.length !== 0 && (
											<>
												{filteredRatingArray.map((rating: Rating, index) => (
													<tr
														key={index}
														id={`${rating._id}`}
														className="ratingTableRow"
														// onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
														// 	handleRatingTableRowClick(event);
														// }}
													>
														<td data-cell="Rating Number" className="ratingNumberCell">
															{rating.ratingNumber}
														</td>

														<td data-cell="Rating Datetime">{`${rating.createdAt?.toString().slice(0, 10)} - ${rating.createdAt
															?.toString()
															.slice(11, 19)}`}</td>

														<td data-cell="Mood Rating">
															{rating.moodRating && (
																<div className="moodRatingTD" id={`${rating.moodRating}TD`}>
																	{rating.moodRating === "Very Stressed" && <FaRegSadCry className="ratingIcon" />}
																	{rating.moodRating === "Mildly Stressed" && <BiSad className="ratingIcon" />}
																	{rating.moodRating === "Neutral" && <CgSmileNeutral className="ratingIcon" />}
																	{rating.moodRating === "Mildly Positive" && <BiSmile className="ratingIcon" />}
																	{rating.moodRating === "Very Positive" && <BiHappy className="ratingIcon" />}
																	<p>{rating.moodRating}</p>
																</div>
															)}
														</td>

														<td data-cell="Optional Message">
															{rating.message != "" && <p>{rating.message}</p>}
															{rating.message === "" && <p>N/A</p>}
														</td>
													</tr>
												))}
												{filteredRatingArray.length === 0 && (
													<tr>
														<td id="noMatchingSearchTermTR" colSpan={4}>
															No rating numbers matching the searched term were found :/
														</td>
													</tr>
												)}
											</>
										)}
									</tbody>
								</table>

								{ratingArray.length === 0 && <h3 id="noExistingRatingsH3">There are no existing ratings in our database :/</h3>}

								<div id="oldRatingsBottomContainer">
									<button
										type="button"
										id="viewOldRatingsBtn"
										className="ratingsBtn"
										onClick={() => {
											setViewOldRatings((prevState) => !prevState);
										}}
									>
										<BiHappy className="ratingsBtnIcon" />
										View Old Ratings
									</button>
								</div>
							</div>
						</>
					)}
				</>
			)}
		</>
	);
};
