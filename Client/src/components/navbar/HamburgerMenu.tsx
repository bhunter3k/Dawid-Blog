type HamburgerProps = {
	onClick: () => void;
	isExpanded: boolean;
};

//HamburgerMenu is a function component that takes in props and returns a react element
//In this case HamburgerMenu takes in an onClick event and an isExpanded boolean
export const HamburgerMenu: React.FC<HamburgerProps> = (props: HamburgerProps) => {
	return (
		<button type="button" className="hamburgerMenuBtn" aria-expanded={props.isExpanded} onClick={props.onClick}>
			<svg className="hamburgerMenuIcon" viewBox="0 0 100 100" width="30" height="40" fill="currentColor">
				<rect className="line top" width="95" height="12" x="2.5" y="20" rx="5"></rect>
				<rect className="line middle" width="95" height="12" x="2.5" y="45" rx="5"></rect>
				<rect className="line bottom" width="95" height="12" x="2.5" y="70" rx="5"></rect>
			</svg>
		</button>
	);
};
