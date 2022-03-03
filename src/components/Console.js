import "../App.css";

function Console(props) {
  return (
    <div className="Console">
      {props.commands.map((ele, i) => (
        <p key={i}>
          {ele.type === "user_command" && ">"} {ele.content}
        </p>
      ))}
      <div ref={props.dummyRef} />
    </div>
  );
}

export default Console;
