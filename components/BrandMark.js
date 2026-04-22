export default function BrandMark({ size = 'md', align = 'left', className = '' }) {
  const classes = ['cp-brand'];

  if (size === 'lg') classes.push('cp-brand--lg');
  if (align === 'center') classes.push('cp-brand--center');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')}>
      <span>consult</span>
      <span className="cp-gradientText">prop</span>
      <span className="cp-brandMuted">.ai</span>
    </div>
  );
}
