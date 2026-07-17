function Notice({ close }) {
  return (
    <>
      <h1>NOTICE</h1>
      <p>Exams will start from 10 August</p>

      <button onClick={close}>
        Close
      </button>
    </>
  );
}

export default Notice;