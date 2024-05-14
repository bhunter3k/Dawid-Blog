export const FooterDesktop = () => {
	return (
		<>
			<div className="footerContainer">
				<h3>
					<u>Contact Details</u>
				</h3>
				<div id="contactDetailsContainer">
					<p>
						Email: <a href="mailto:@uea.ac.uk"></a>
					</p>
					<p>
						Github: <a href="https://github.com/bhunter3k">bhunter3k</a>
					</p>
				</div>
			</div>
		</>
	);
};

export const FooterMobile = () => {
	return (
		<>
			<div className="footerContainer2">
				<h3>
					<u>Contact Details</u>
				</h3>
				<br />
				<p>Email: </p>
				<br />
				<p>Github: bhunter3k</p>
			</div>
		</>
	);
};
