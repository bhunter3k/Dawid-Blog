type HamburgerProps = {
	onClick: () => void;
	isExpanded: boolean;
};

//HamburgerMenu is a function component that takes in props and returns a react element
//In this case HamburgerMenu takes in an onClick event and an isExpanded boolean
export const HamburgerMenu: React.FC<HamburgerProps> = (props: HamburgerProps) => {
	return (
		<button type="button" className="hamburgerMenuBtn" aria-expanded={props.isExpanded} onClick={props.onClick}>
			<svg className="hamburgerMenuIcon" viewBox="0 0 100 100" width="50" height="50" fill="currentColor">
				<>
					<line className="SVGLine Top" x1="20" y1="20" x2="80" y2="50" stroke="black" strokeWidth="5" strokeLinecap="round" />
					<line className="SVGLine Bottom" x1="20" y1="80" x2="80" y2="50" stroke="black" strokeWidth="5" strokeLinecap="round" />
				</>
			</svg>
		</button>
	);
};
