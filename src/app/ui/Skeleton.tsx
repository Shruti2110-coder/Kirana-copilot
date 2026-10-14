/** Grey placeholder lines shown while a page's data loads. */
export default function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      <i className="short" />
      <i className="big" />
      <i />
      <i />
      <i className="short" />
    </div>
  );
}
