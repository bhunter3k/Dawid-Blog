// import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
// import { Navbar, FooterDesktop, FooterMobile } from "./components/";
// import { Home, Dashboard, AboutMe, Contact } from "./pages/";
import { Dashboard } from "./pages/";

function App() {
	return (
		<>
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/dashboard" element={<Dashboard />} />
			</Routes>
			{/* <div className="appContainer">
				<div className="leftContainer">
					<Navbar />
					<FooterDesktop />
				</div>
				<div className="rightContainer">
					<div className="mainContentContainer">
						<Routes>
							<Route path="/homePage" element={<Home />} />
							<Route path="/" element={<Dashboard />} />
							<Route path="/dashboardPage" element={<Dashboard />} />

							<Route path="/aboutMePage" element={<AboutMe />} />
							<Route path="/contactPage" element={<Contact />} />
						</Routes>
					</div>
					<FooterMobile />
				</div>
			</div> */}
		</>
	);
}

export default App;
