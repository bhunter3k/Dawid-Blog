import { useState, useRef } from "react";
import { Logo, HamburgerMenu, Navbar } from "..";

export const TopContainer = () => {
	//Bool state used for setting "in" prop of CSSTransition component to enter (true) or exit (false)
	const [isEnter, setIsEnter] = useState<boolean>(false);
	const [navClassName, setNavClassName] = useState<string>("navbarMobileContainerInitial");

	const burgerClick = () => {
		//Set to true if false, or set to false if true
		setIsEnter(!isEnter);
		setNavClassName("navbarMobileContainerAfter");
	};

	//nodeRef is used to specify that animations should only be applied to the NavBarTemplate component
	const nodeRef = useRef(null);

	return (
		<>
			<HamburgerMenu onClick={burgerClick} isExpanded={isEnter} />
			<Logo />
			<p>YouTube</p>
			<p>TikTok</p>
			<p>GitHub</p>
		</>
	);
};
