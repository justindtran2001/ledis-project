import "./App.css";
import Console from "./components/Console";
import UserCommand from "./components/UserCommand";
import { useEffect, useRef, useState } from "react";

function App() {
  /*
    STATES
  */
  // commandList stores all the commands and queried results to render in the console
  const [commandList, setCommandList] = useState([]);
  // expiringKeyList stores all the key-value pairs that is expiring (Purpose: Get the remaining time by store a Date when it is expired)
  const [expiringKeyList, setExpiringKeyList] = useState([]);
  const dummyRef = useRef(null);

  const handleGetCommand = (key) => {
    if (!key) return "ERROR: GET command: Invalid parameters";

    // Get value from key
    let value = JSON.parse(localStorage.getItem(key));
    if (!value) return "ERROR: Key not found";
    else return `"${value}"`;
  };

  const handleSetCommand = (key, value) => {
    // Params check
    if (!key || !value) return "ERROR: SET command: Invalid parameters";

    // Save to storage
    localStorage.setItem(key, JSON.stringify(value));
    return "OK";
  };

  const handleSAddCommand = (key, valueArr) => {
    // Params check
    if (!key || !Array.isArray(valueArr) || valueArr.length === 0)
      return "ERROR: SADD command: Invalid parameters";

    // Removing duplicates
    let newValueSet = [...new Set(valueArr)];

    // Check if the set already exists
    let currentValues = localStorage.getItem(key);
    if (currentValues === null) {
      // Create new set
      localStorage.setItem(key, JSON.stringify(newValueSet));
    } else {
      // Set already exists => Update the set
      let updatedValueSet = [
        ...new Set(JSON.parse(currentValues).concat(newValueSet)),
      ];

      localStorage.setItem(key, JSON.stringify(updatedValueSet));
    }

    return "OK";
  };

  const handleSRemCommand = (key, removeValueArr) => {
    // Params check
    if (!key || !Array.isArray(removeValueArr) || removeValueArr.length === 0)
      return "ERROR: SREM command: Invalid parameters";

    // Get the existing set in storage
    let valueSetInStorage = localStorage.getItem(key);
    if (!valueSetInStorage)
      return `ERROR: SREM command: Key ${key} not found storage`;

    valueSetInStorage = JSON.parse(valueSetInStorage);

    // Removing the values by using filter()
    valueSetInStorage = valueSetInStorage.filter((ele) => {
      let tmp = !removeValueArr.includes(ele);
      return tmp;
    });

    // Re-save the set
    localStorage.setItem(key, JSON.stringify(valueSetInStorage));
    return "OK";
  };

  const handleSMembersCommand = (key) => {
    // Check key param
    if (!key) return "ERROR: SMEMBERS command: Invalid key";

    // Get [key]'s values from storage with
    let resValueSet = localStorage.getItem(key);
    resValueSet = JSON.parse(resValueSet);

    // Check if the value is an array or a single value
    if (!Array.isArray(resValueSet))
      return "ERROR: SMEMBERS command: Returned value is not an array";

    return resValueSet.map((ele, i) => `${i + 1}) ${ele}`);
  };

  const handleKeysCommand = () => {
    // Check storage
    if (!localStorage.length) return "No keys in storage";

    // Init array of keys
    let keyArr = [];

    // Get keys from storage
    for (let i = 0; i < localStorage.length; ++i) {
      keyArr.push(`${i + 1}) ${localStorage.key(i)}`);
    }
    console.log(keyArr);
    return keyArr;
  };

  const handleDelCommand = (key) => {
    // Check key param
    if (!key) return "ERROR: DEL command: Invalid parameters";

    // Check if the key [key] exists in storage
    if (!localStorage.getItem(key))
      return `ERROR: DEL command: Key '${key}' not in storage`;

    // Delete pair with [key]
    localStorage.removeItem(key);
    return "OK";
  };

  const handleExpireCommand = (key, seconds) => {
    // Check valid param
    if (!key || !seconds) return "ERROR: EXPIRE command: Invalid parameters";

    // Check if [seconds] is valid
    if (parseInt(seconds) <= 0)
      return "ERROR: EXPIRE command: [seconds] parameter must be positive";

    // Check if pair with [key] exists in storage
    if (!localStorage.getItem(key))
      return `ERROR: DEL command: Key '${key}' not in storage`;
    else {
      //// Set expiration

      // Convert the input 'seconds' into ms interval
      let timeIntervalMilisecond = parseInt(seconds) * 1000;

      // Set the timer
      setTimeout(() => {
        /*
        What happens when the timer runs out
        */
        // Removing from storage
        localStorage.removeItem(key);
        // Removing from the expiring keys list
        setExpiringKeyList(...expiringKeyList.filter((ele) => ele.key === key));
      }, timeIntervalMilisecond);

      // After setting the timer, keep a record of that expiring key and its expiring time
      setExpiringKeyList([
        ...expiringKeyList,
        { key: key, expireTime: Date.now() + timeIntervalMilisecond },
      ]);

      return "OK";
    }
  };

  const handleTtlCommand = (key) => {
    // Check invalid param
    if (!key) return "ERROR: TTL command: 'key' parameter not valid";

    // Check [key] exists in storage
    if (!localStorage.getItem(key))
      return `ERROR: TTL command: Item with key ${key} does not exist in storage`;

    // Check if the pair of key [key] is expiring
    if (!expiringKeyList.find((ele) => ele.key === key))
      return `ERROR: TTL command: Key ${key} is not expiring`;

    // Get the remaining time from the key's expiring time and the current time
    let timeRemaining =
      expiringKeyList.find((ele) => ele.key === key).expireTime - Date.now();

    return Math.ceil(timeRemaining / 1000).toString();
  };

  const processCommand = (user_cmd) => {
    let arr = user_cmd.trim().split(" ");
    switch (arr[0].toLowerCase()) {
      case "get":
        return handleGetCommand(arr[1]);
      case "set":
        return handleSetCommand(
          arr[1],
          arr[2].replaceAll("'", "").replaceAll('"', "")
        );
      case "sadd":
        return handleSAddCommand(arr[1], arr.slice(2));
      case "srem":
        return handleSRemCommand(arr[1], arr.slice(2));
      case "smembers":
        return handleSMembersCommand(arr[1]);
      case "keys":
        return handleKeysCommand();
      case "del":
        return handleDelCommand(arr[1]);
      case "expire":
        return handleExpireCommand(arr[1], arr[2]);
      case "ttl":
        return handleTtlCommand(arr[1]);
      default:
        return `ERROR: Invalid command '${arr[0]}'`;
    }
  };

  const handleUserCommandSubmit = (e) => {
    if (e.keyCode === 13) {
      // Get command
      let user_command = e.target.value;

      // Process the command and return the result
      let query_result = processCommand(user_command);

      if (Array.isArray(query_result)) {
        // If the result is an array (In this case, a Set)
        setCommandList([
          ...commandList,
          { content: user_command, type: "user_command" },
          ...query_result.map((ele) => {
            return { content: ele, type: "query_result" };
          }),
        ]);
      } else {
        // If the result is a normal string
        setCommandList([
          ...commandList,
          { content: user_command, type: "user_command" },
          { content: query_result, type: "query_result" },
        ]);
      }

      // Empty input box
      e.target.value = "";

      // Scroll the console to bottom
      let consoleEle = document.getElementsByClassName("Console");
      consoleEle.scrollTop = consoleEle.scrollHeight;
    }
  };

  const scrollToBottom = () => {
    dummyRef.current.scrollIntoView();
  };

  useEffect(() => {
    scrollToBottom();
  }, [commandList]);

  return (
    <div className="App">
      <Console commands={commandList} dummyRef={dummyRef} />
      <UserCommand onSubmitCommand={handleUserCommandSubmit} />
    </div>
  );
}

export default App;
