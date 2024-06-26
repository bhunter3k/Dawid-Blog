import { Route, Routes } from "react-router-dom";
import { TopContainer, Navbar } from "./components/";
import { Home, Dashboard, AboutMe, Contact } from "./pages/";

function App() {
	return (
		<>
			<div id="appContainer">
				<div id="topContainer">
					<TopContainer />
				</div>

				<div id="bottomContainer">
					<div id="leftContainer">
						<Navbar />
					</div>

					<div id="rightContainer">
						<div id="mainContentContainer">
							<Routes>
								<Route path="/" element={<Home />} />
								<Route path="/home" element={<Home />} />
								<Route path="/dashboard" element={<Dashboard />} />
								<Route path="/aboutMe" element={<AboutMe />} />
								<Route path="/contact" element={<Contact />} />
							</Routes>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export default App;
