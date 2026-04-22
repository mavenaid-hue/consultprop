const paths = {
  buyer: (
    <>
      <path
        d="M8.25 19.25v-5.75c0-.69.56-1.25 1.25-1.25h5c.69 0 1.25.56 1.25 1.25v5.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 10.75 12 4l7.5 6.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8.95v9.8c0 .28.22.5.5.5h10c.28 0 .5-.22.5-.5v-9.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  seller: (
    <>
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.5 8.25h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 15.75H13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14.75 2.75v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.25 2.75v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
};

export default function RoleGlyph({ role = 'buyer', className = '' }) {
  return (
    <span className={className} aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {paths[role] || paths.buyer}
      </svg>
    </span>
  );
}
