import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CSSTransition } from "react-transition-group";

// Import react-icons
import { FaHome, FaUserAlt, FaPhoneSquareAlt } from "react-icons/fa";
import { RxDashboard } from "react-icons/rx";

export const Navbar = () => {
	const location = useLocation();

	function isCurrent(path: string) {
		return location.pathname === path;
	}

	return (
		<div id="navbarContainer">
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
		</div>
	);
};
