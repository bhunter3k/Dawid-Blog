import { useState, useRef } from "react";
import { Route, Routes } from "react-router-dom";
import { TopContainer, HamburgerMenu, Logo, Navbar } from "./components/";
import { Home, Dashboard, AboutMe, Contact } from "./pages/";

import { CSSTransition } from "react-transition-group";

function App() {
	//Bool state used for setting "in" prop of CSSTransition component to enter (true) or exit (false)
	const [isEnter, setIsEnter] = useState<boolean>(false);

	const burgerClick = () => {
		//Set to true if false, or set to false if true
		setIsEnter(!isEnter);
	};

	//nodeRef is used to specify that animations should only be applied to the NavBarTemplate component
	const nodeRef = useRef(null);

	return (
		<>
			<div id="appContainer">
				<div id="topContainer">
					{/* <TopContainer /> */}

					<HamburgerMenu onClick={burgerClick} isExpanded={isEnter} />
					<Logo />
					<p>YouTube</p>
					<p>TikTok</p>
					<p>GitHub</p>
				</div>

				<div id="bottomContainer">
					<CSSTransition in={isEnter} nodeRef={nodeRef} timeout={400} unmountOnExit>
						<div id="leftContainer" ref={nodeRef}>
							<CSSTransition in={isEnter} nodeRef={nodeRef} timeout={300} unmountOnExit>
								<div id="navbarContainer" ref={nodeRef}>
									<Navbar />
								</div>
							</CSSTransition>
						</div>
					</CSSTransition>

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
