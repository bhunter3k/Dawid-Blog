import { useState, useEffect } from "react";
import { DashCard, SearchBar } from "../../components";
import featureOverviewJSON from "../../json/featureOverview.json";
import "../../scss/scssComponents/_index.scss";

//A type that defines an array of objects that contain Heading, Image, Summary and ToolsUsed
type FeatureArrayType = {
	Heading: string;
	Image: string;
	Summary: string;
	ToolsUsed: string;
	Link: string;
}[];

//Initial state of featureArray - an array containing object
const initialState = [{ Heading: "", Image: "", Summary: "", ToolsUsed: "", Link: "" }];

const Dashboard = () => {
	//featureArray state will only accept an array containing an object as defined in FeatureArrayType
	const [featureArray, setFeatureArray] = useState<FeatureArrayType>(initialState);
	const [searchTerm, setSearchTerm] = useState<string>("");

	//UseEffect will only be called on mounting of this component or if searchTerm is empty
	useEffect(() => {
		settingFeatureArray();
	}, []);

	//UseEffect will only be called if the searchTerm state changes
	useEffect(() => {
		if (searchTerm != "") {
			searchFeatureArray(searchTerm);
		} else {
			settingFeatureArray();
		}
	}, [searchTerm]);

	//sets featureArray state to contain imported JSON information - is called when component is first mounted and if searchTerm is empty
	function settingFeatureArray(): void {
		let tempArray: FeatureArrayType = [];

		featureOverviewJSON.forEach((feature) => {
			tempArray.push(feature);
		});

		setFeatureArray(tempArray);
	}

	//sets featureArray state to only include Headings that contain the searchTerm - is called when searchTerm is not empty
	function searchFeatureArray(searchTerm: string): void {
		let tempArray: FeatureArrayType = [];

		featureArray.forEach((feature) => {
			if (feature.Heading.toLowerCase().includes(searchTerm.toLowerCase())) {
				tempArray.push(feature);
			}
		});

		setFeatureArray(tempArray);
	}

	return (
		<>
			<h1>Dashboard:</h1>
			<h3>
				A page displaying a portfolio of my projects. Feel free to find out more about each project by click on the project's card or navigating to it
				using the navbar :)
			</h3>

			<hr />

			<div id="dashboardContainer">
				hello
				<SearchBar
					placeholder="Search dashboard by feature title..."
					onChange={(event) => {
						setSearchTerm(event.target.value);
					}}
				/>
				<div id="projectCardContainer">
					{featureArray.length === 0 ? (
						<p>Search term not found... Maybe try search by heading of each card...</p>
					) : (
						featureArray.map((feature, index) => {
							return (
								<>
									<DashCard key={index} feature={feature} />
								</>
							);
						})
					)}
				</div>
			</div>
		</>
	);
};

export default Dashboard;
