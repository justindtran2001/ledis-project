import "../App.css";

function UserCommand(props) {
  return (
    <input
      type="text"
      className="UserCommand"
      onKeyUp={props.onSubmitCommand}
    />
  );
}

export default UserCommand;
