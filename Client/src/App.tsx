// import { useState, useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Navbar, FooterDesktop, FooterMobile } from "./components/";
import { Home, Dashboard, AboutMe, Contact } from "./pages/";

function App() {
	return (
		<>
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

							<Route path="/aboutMePage" element={<AboutMe />} />
							<Route path="/contactPage" element={<Contact />} />
						</Routes>
					</div>
					<FooterMobile />
				</div>
			</div>
		</>
	);
}

export default App;
