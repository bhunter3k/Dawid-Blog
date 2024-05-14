// import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar, FooterDesktop, FooterMobile } from "./components/";
import { Home, Dashboard, AboutMe, Contact } from "./pages/";

function App() {
	return (
		<>
			<div id="appContainer">
				<div id="leftContainer">
					<Navbar />
					<FooterDesktop />
				</div>
				<div id="rightContainer">
					<div id="mainContentContainer">
						<Routes>
							<Route path="/home" element={<Home />} />
							<Route path="/" element={<Home />} />
							<Route path="/dashboard" element={<Dashboard />} />

							<Route path="/aboutMe" element={<AboutMe />} />
							<Route path="/contact" element={<Contact />} />
						</Routes>
					</div>
					<FooterMobile />
				</div>
			</div>
		</>
	);
}

export default App;
