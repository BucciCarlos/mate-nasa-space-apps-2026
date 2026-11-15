import './brandMark.css';

/** M.A.T.E. lockup: the mate gourd with its straw and pulse line above the name. The SVG is decorative; the link around it keeps the accessible name. */
export function BrandMark({ name }: { name: string }) {
  return <span className="brand-lockup">
    <svg className="brand-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
      <path className="brand-mark-body" d="M10 11c0-4.6 2.6-6.5 6-6.5s6 1.9 6 6.5c0 5-2.6 8-6 8s-6-3-6-8z" />
      <path className="brand-mark-straw" d="M19.5 8.5 24 2.5" />
      <path className="brand-mark-pulse" d="M2 26h7l1.8-3 2.4 5.5 2.6-7.5 1.6 4.5H30" />
    </svg>
    <span className="brand-mark-name">{name}</span>
  </span>;
}

/** Test variant: the supplied logo image (symbol and letters together). The image's alt keeps the link's accessible name. */
export function BrandImage({ name }: { name: string }) {
  return <img className="brand-logo" src={`${import.meta.env.BASE_URL}brand/logo-prueba.jpeg`} alt={name} width={56} height={56} />;
}
