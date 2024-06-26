import React from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";

// Import react-icons
import { FaHome, FaUserAlt, FaPhoneSquareAlt } from "react-icons/fa";
import { RxDashboard } from "react-icons/rx";
import { Logo, HamburgerMenu } from "../";

const NavbarTemplate = () => {
	const location = useLocation();

	function isCurrent(path: string) {
		return location.pathname === path;
	}

	return (
		<ul>
			<li>
				<Link to="/home" className="navbarLink" id={isCurrent("/home") ? "current" : ""}>
					<FaHome className="navIcon" />
					Home
				</Link>
			</li>
			<li>
				<Link to="/dashboard" className="navbarLink" id={isCurrent("/dashboard") ? "current" : ""}>
					<RxDashboard className="navIcon" />
					Feature Dashboard
				</Link>
			</li>
			<li>
				<Link to="/rating" className="navbarLink dashBoardLink" id={isCurrent("/rating") ? "current" : ""}>
					1) Rate Today's Mood
				</Link>
			</li>
			<li>
				<Link to="/journal" className="navbarLink dashBoardLink" id={isCurrent("/journal") ? "current" : ""}>
					2) Journal
				</Link>
			</li>
			<li>
				<Link to="/selfie" className="navbarLink dashBoardLink" id={isCurrent("/selfie") ? "current" : ""}>
					3) Selfie
				</Link>
			</li>
			<li>
				<Link to="/recommendations" className="navbarLink dashBoardLink" id={isCurrent("/recommendations") ? "current" : ""}>
					4) Advice/Activities
				</Link>
			</li>
			<li>
				<Link to="/stats" className="navbarLink dashBoardLink" id={isCurrent("/stats") ? "current" : ""}>
					5) History/Statistics
				</Link>
			</li>
			<li>
				<Link to="/contact" className="navbarLink" id={isCurrent("/contact") ? "current" : ""}>
					<FaPhoneSquareAlt className="navIcon" />
					Contact
				</Link>
			</li>
			<li>
				<Link to="/aboutMe" className="navbarLink" id={isCurrent("/aboutMe") ? "current" : ""}>
					<FaUserAlt className="navIcon" />
					About Me
				</Link>
			</li>
		</ul>
	);
};

//Navbar for view ports above 740px
const NavbarDesktop = () => {
	return (
		<>
			<div className="navbarDesktopContainer">
				<Logo />
				<NavbarTemplate />
			</div>
		</>
	);
};

//Navbar for view ports below 740px
const NavbarMobile = () => {
	//Bool state used for setting "in" prop of CSSTransition component to enter (true) or exit (false)
	const [isEnter, setIsEnter] = useState<boolean>(false);
	const [navClassName, setNavClassName] = useState<string>("navbarMobileContainerInitial");

	const burgerClick = () => {
		//Set to true if false, or set to false if true
		setIsEnter(!isEnter);
		setNavClassName("navbarMobileContainerAfter");
	};

	//nodeRef is used to specify that animations should only be applied to the NavBarTemplate component
	const nodeRef = React.useRef(null);

	return (
		<>
			<div className="logoHamburgerContainer">
				<Logo />
				<div className="hamburgerMenuContainer">
					<HamburgerMenu onClick={burgerClick} isExpanded={isEnter} />
				</div>
			</div>

			<CSSTransition nodeRef={nodeRef} in={isEnter} timeout={500} classNames="navbarMobile">
				<div className={navClassName} ref={nodeRef}>
					<NavbarTemplate />
				</div>
			</CSSTransition>
		</>
	);
};

export const Navbar = () => {
	//Bool state used to determine if viewport is less than 740px (true) or more than 740px (false)
	const [isMobile, setIsMobile] = useState<boolean>(window.matchMedia("(max-width: 740px)").matches);

	//useEffect used to update isMobile state based on changes to viewport
	useEffect(() => {
		const viewport = window.matchMedia("(max-width: 740px)");

		function updateIsMobile(e: MediaQueryListEvent): void {
			setIsMobile(e.matches);
		}

		//Adds a change eventListener that calls the updateIsMobile function when change in viewport is detected
		viewport.addEventListener("change", updateIsMobile);

		//A cleanup function used to remove the change eventListener when component is unmounted from the DOM
		return () => {
			viewport.removeEventListener("change", updateIsMobile);
		};
	}, []);

	// if isMobile is true show NavbarMobile else show NavbarDesktop
	return <> {isMobile ? <NavbarMobile /> : <NavbarDesktop />}</>;
};
