import { useRef } from "react";

type DialogProps = {
	header: string;
	dialogShow: boolean;
	dialogConfirmation: "confirmation" | "understand" | "manualPrediction";
	onConfirm: () => void;
	onCancel: () => void;
	onUnderstand: () => void;
	onManualPrediction: () => void;
};

//reusable dialog component used to display confirmation/validation messages to the user before important actions
export const Dialog: React.FC<DialogProps> = (props: DialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);

	if (props.dialogShow) {
		dialogRef.current?.showModal();
	} else {
		dialogRef.current?.close();
	}

	//two different dialog's will be rendered based on if conformation or validation is involved
	return (
		<>
			<dialog id="confirmationDialog" ref={dialogRef}>
				<div id="dialogDiv">
					<h3>{props.header}</h3>
					<br />
					<div id="logoutButtons">
						{props.dialogConfirmation != "understand" && (
							<>
								<button
									type="submit"
									id="dialogConfirmBtn"
									className="dialogBtn"
									onClick={() => {
										{
											props.dialogConfirmation === "manualPrediction" ? props.onManualPrediction() : props.onConfirm();
										}
									}}
								>
									Confirm
								</button>
								<button
									type="button"
									id="dialogCancelBtn"
									className="dialogBtn"
									onClick={() => {
										props.onCancel();
									}}
								>
									Cancel
								</button>
							</>
						)}

						{props.dialogConfirmation === "understand" && (
							<button
								type="button"
								id="dialogUnderstoodBtn"
								className="dialogBtn"
								onClick={() => {
									props.onUnderstand();
								}}
							>
								I understand
							</button>
						)}
					</div>
				</div>
			</dialog>
		</>
	);
};
