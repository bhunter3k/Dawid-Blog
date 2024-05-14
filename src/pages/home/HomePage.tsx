import dawidPhoto from "../../assets/dawidPhoto.jpg";

export const Home = () => {
	return (
		<>
			<h1>Home Page</h1>
			<hr />
			<p>test</p>

			<img src={dawidPhoto} alt="Dawid's Blog Logo" id="blogLogo" loading="eager" />
		</>
	);
};
