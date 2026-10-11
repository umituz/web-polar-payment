/**
 * PortalSpinner
 *
 * Dependency-free loading spinner. The rotation is SMIL (`<animateTransform>`)
 * rather than a CSS keyframe, so it animates even in hosts whose stylesheets
 * never load or reset `@keyframes`.
 */

export const PortalSpinner = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="44 19"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);
