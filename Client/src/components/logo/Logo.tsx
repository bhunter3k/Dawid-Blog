import logoDesign from "../../assets/1st-Idea-NB.png";

const Logo = () => {
	return (
		<>
			<div className="blogLogoContainer">
				<img src={logoDesign} alt="Dawid's Blog Logo" className="blogLogo" loading="eager" />
				<h1 id="logoHeader">Dawid's Blog</h1>
			</div>
		</>
	);
};

export default Logo;
