<style>
	div {
		height: auto;
		top: 50%;
		padding: 5px 0 5px 0;
		text-align: center;
		z-index: 100;
		border: 1px solid var(--form-error-color-text, #ff0000);
		border-radius: 5px;
		background-color: var(--form-error-color-background, #fff0f0);
		color: var(--form-error-color-text, #ff0000);
		line-height: normal;
	}
</style>

<div>
	<slot>This is the default error message</slot>
</div>
