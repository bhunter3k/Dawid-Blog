// import { useState, useEffect } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Navbar, FooterDesktop, FooterMobile } from "./components/";
import {
	Login,
	Home,
	Dashboard,
	RateMood,
	MoodJournalTFJS,
	MoodJournalBackend,
	MoodSelfieTFJS,
	MoodSelfieBackend,
	Recommendations,
	StatsTrends,
	AboutMe,
	Contact,
} from "./pages/";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function App() {
	const location = useLocation();
	const isLoginPage = location.pathname === "/login";

	const navigate = useNavigate();

	const [tfjsCompatible, setTFJSCompatible] = useState<"true" | "false" | "not tested">();

	useEffect(() => {
		async function fetchData() {
			try {
				const check = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/authenticationCheck", {
					method: "GET",
					credentials: "include",
				});

				const status = check.status;

				if (status === 401) {
					// Redirect to the login page if unauthorized
					navigate("/loginPage", { replace: true });
				} else {
					fetchUserTFJSCompatibility();
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		}

		fetchData();
	}, []);

	async function fetchUserTFJSCompatibility() {
		console.log("fetching user's tfjs compatibility");

		const user = await fetch("https://tpd20seu.projects.cmp.uea.ac.uk/user/", {
			method: "GET",
			credentials: "include",
		});

		const userData = await user.json();

		setTFJSCompatible(userData.tfjsCompatible);

		console.log(tfjsCompatible);
	}

	return (
		<>
			<Routes>
				<Route path="/loginPage" element={<Login />} />
			</Routes>

			{!isLoginPage && (
				<div className="appContainer">
					<div className="leftContainer">
						<Navbar />
						<FooterDesktop />
					</div>
					<div className="rightContainer">
						<div className="mainContentContainer">
							<Routes>
								<Route path="/homePage" element={<Home />} />
								<Route path="/" element={<Navigate to="/loginPage" />} />
								<Route path="/dashboardPage" element={<Dashboard />} />
								<Route path="/ratingPage" element={<RateMood />} />
								<Route path="/journalPage" element={tfjsCompatible === "true" ? <MoodJournalTFJS /> : <MoodJournalBackend />} />
								<Route path="/selfiePage" element={tfjsCompatible === "true" ? <MoodSelfieTFJS /> : <MoodSelfieBackend />} />
								<Route path="/recommendationsPage" element={<Recommendations />} />
								<Route path="/statsPage" element={<StatsTrends />} />
								<Route path="/aboutMePage" element={<AboutMe />} />
								<Route path="/contactPage" element={<Contact />} />
							</Routes>
						</div>
						<FooterMobile />
					</div>
				</div>
			)}
		</>
	);
}

export default App;
