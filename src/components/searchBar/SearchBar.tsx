import { FaSearch } from "react-icons/fa";

type SearchBarProps = {
	placeholder: string;
	onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const SearchBar: React.FC<SearchBarProps> = (props: SearchBarProps) => {
	return (
		<div id="searchBarContainer">
			<input type="text" id="searchBar" placeholder={props.placeholder} onChange={props.onChange} maxLength={37}></input>
			<FaSearch id="searchIcon" />
		</div>
	);
};
