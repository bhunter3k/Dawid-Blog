import logoDesign3 from "../../assets/LogoDesign3.png";

const Logo = () => {
	return (
		<>
			<div className="blogLogoContainer">
				<img src={logoDesign3} alt="Dawid's Blog Logo" className="blogLogo" loading="eager" />
				<h1 id="logoHeader">You Are Not Your Thoughts!</h1>
			</div>
		</>
	);
};

export default Logo;
