import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";

import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";

function Home() {
  const {
    userData,
    serverUrl,
    setUserData,
    getGeminiResponse,
  } = useContext(userDataContext);

  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);

  // ================================
  // REFS
  // ================================

  const recognitionRef = useRef(null);

  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const isProcessingRef = useRef(false);

  const shouldListenRef = useRef(false);
  const isMountedRef = useRef(true);

  const restartTimeoutRef = useRef(null);

  // ================================
  // LOGOUT
  // ================================

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      setUserData(null);
      navigate("/signin");
    }
  };

  // ================================
  // START RECOGNITION
  // ================================

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      console.log("❌ Recognition not initialized");
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    if (!shouldListenRef.current) {
      console.log("🎤 Listening is disabled");
      return;
    }

    if (isSpeakingRef.current) {
      console.log("🔊 AI is speaking");
      return;
    }

    if (isProcessingRef.current) {
      console.log("🤖 AI is processing");
      return;
    }

    if (isRecognizingRef.current) {
      console.log("🎤 Recognition already running");
      return;
    }

    try {
      console.log("🎤 Starting recognition");

      recognition.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error);
      }
    }
  }, []);

  // ================================
  // RESTART RECOGNITION
  // ================================

  const restartRecognition = useCallback(() => {
    clearTimeout(restartTimeoutRef.current);

    restartTimeoutRef.current = setTimeout(() => {
      if (
        isMountedRef.current &&
        shouldListenRef.current &&
        !isSpeakingRef.current &&
        !isProcessingRef.current &&
        !isRecognizingRef.current
      ) {
        startRecognition();
      }
    }, 1000);
  }, [startRecognition]);

  // ================================
  // SPEAK FUNCTION
  // ================================

  const speak = useCallback(
    (text) => {
      if (!text) {
        isProcessingRef.current = false;
        shouldListenRef.current = true;

        restartRecognition();
        return;
      }

      // Disable listening while AI speaks
      shouldListenRef.current = false;

      clearTimeout(restartTimeoutRef.current);

      // Stop recognition only if currently active
      if (isRecognizingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log("Recognition stop error:", error);
        }
      }

      // Cancel previous speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = "en-US";

      utterance.onstart = () => {
        console.log("🔊 AI started speaking");

        isSpeakingRef.current = true;
        setListening(false);
      };

      utterance.onend = () => {
        console.log("🔊 AI finished speaking");

        if (!isMountedRef.current) return;

        isSpeakingRef.current = false;
        isProcessingRef.current = false;

        setAiText("");

        shouldListenRef.current = true;

        restartRecognition();
      };

      utterance.onerror = (event) => {
        console.log("Speech error:", event);

        if (!isMountedRef.current) return;

        isSpeakingRef.current = false;
        isProcessingRef.current = false;

        setAiText("");

        shouldListenRef.current = true;

        restartRecognition();
      };

      window.speechSynthesis.speak(utterance);
    },
    [restartRecognition]
  );

  // ================================
  // CLEAN YOUTUBE QUERY
  // ================================

  const cleanYouTubeQuery = (text) => {
    if (!text) return "";

    let query = text.toLowerCase();

    const assistantName =
      userData?.assistantName?.toLowerCase();

    if (assistantName) {
      query = query.replace(
        new RegExp(`\\b${assistantName}\\b`, "gi"),
        ""
      );
    }

    query = query
      .replace(/\bhello\b/gi, "")
      .replace(/\bhey\b/gi, "")
      .replace(/\bhi\b/gi, "")
      .replace(/\bplease\b/gi, "")
      .replace(/\bopen\b/gi, "")
      .replace(/\byoutube\b/gi, "")
      .replace(/\bplay\b/gi, "")
      .replace(/\bsearch\b/gi, "")
      .replace(/\bon\b/gi, "")
      .replace(/\bfor\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return query;
  };

  // ================================
  // HANDLE COMMAND
  // ================================

  const handleCommand = useCallback(
    (data) => {
      if (!data) {
        const message =
          "Sorry, I could not process your request.";

        setAiText(message);
        speak(message);

        return;
      }

      const {
        type,
        userInput,
        response,
      } = data;

      console.log("🤖 Command received:", data);

      const message =
        response ||
        "Sorry, I could not process your request.";

      // ----------------
      // GOOGLE SEARCH
      // ----------------

      if (type === "google-search") {
        const query = encodeURIComponent(
          userInput || ""
        );

        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            `https://www.google.com/search?q=${query}`,
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // CALCULATOR
      // ----------------

      if (type === "calculator-open") {
        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            "https://www.google.com/search?q=calculator",
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // INSTAGRAM
      // ----------------

      if (type === "instagram-open") {
        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            "https://www.instagram.com/",
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // FACEBOOK
      // ----------------

      if (type === "facebook-open") {
        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            "https://www.facebook.com/",
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // WEATHER
      // ----------------

      if (type === "weather-show") {
        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            "https://www.google.com/search?q=weather",
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // YOUTUBE OPEN
      // ----------------

      if (type === "youtube-open") {
        setAiText(message);
        speak(message);

        setTimeout(() => {
          window.open(
            "https://www.youtube.com/",
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // YOUTUBE SEARCH
      // ----------------

      if (
        type === "youtube-search" ||
        type === "youtube-play"
      ) {
        const query = cleanYouTubeQuery(userInput);

        setAiText(message);
        speak(message);

        setTimeout(() => {
          if (!query) {
            window.open(
              "https://www.youtube.com/",
              "_blank"
            );

            return;
          }

          const encodedQuery =
            encodeURIComponent(query);

          window.open(
            `https://www.youtube.com/results?search_query=${encodedQuery}`,
            "_blank"
          );
        }, 500);

        return;
      }

      // ----------------
      // NORMAL RESPONSE
      // ----------------

      setAiText(message);
      speak(message);
    },
    [speak]
  );

  // ================================
  // INITIALIZE SPEECH RECOGNITION
  // ================================

  useEffect(() => {
    if (!userData?.assistantName) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        "Speech recognition is not supported"
      );

      setAiText(
        "Speech recognition is not supported in this browser."
      );

      return;
    }

    isMountedRef.current = true;

    const recognition = new SpeechRecognition();

    // IMPORTANT
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;

    // ================================
    // ON START
    // ================================

    recognition.onstart = () => {
      console.log("🎤 Recognition started");

      isRecognizingRef.current = true;

      setListening(true);
    };

    // ================================
    // ON RESULT
    // ================================

    recognition.onresult = async (event) => {
      if (
        isSpeakingRef.current ||
        isProcessingRef.current
      ) {
        return;
      }

      const transcript =
        event.results[
          event.results.length - 1
        ][0].transcript.trim();

      if (!transcript) return;

      console.log("🗣️ User said:", transcript);

      const assistantName =
        userData.assistantName.toLowerCase();

      // Check wake word
      if (
        !transcript
          .toLowerCase()
          .includes(assistantName)
      ) {
        return;
      }

      console.log("🔥 Wake word detected");

      // Stop future recognition restarts
      shouldListenRef.current = false;

      // AI processing
      isProcessingRef.current = true;

      setUserText(transcript);
      setAiText("");

      // Stop recognition safely
      if (isRecognizingRef.current) {
        try {
          recognition.stop();
        } catch (error) {
          console.log(
            "Recognition stop error:",
            error
          );
        }
      }

      try {
        console.log(
          "🤖 Sending request to Gemini..."
        );

        const data =
          await getGeminiResponse(transcript);

        if (!data) {
          throw new Error(
            "No response from Gemini"
          );
        }

        console.log(
          "🤖 Gemini response:",
          data
        );

        setUserText("");

        handleCommand(data);
      } catch (error) {
        console.error(
          "Gemini request error:",
          error
        );

        setUserText("");

        const message =
          "Sorry, something went wrong.";

        setAiText(message);

        speak(message);
      }
    };

    // ================================
    // ON ERROR
    // ================================

    recognition.onerror = (event) => {
      console.log(
        "🎤 Recognition error:",
        event.error
      );

      // "aborted" can happen when WE intentionally stop it.
      // Don't treat it as a serious error.

      if (event.error === "aborted") {
        console.log(
          "ℹ️ Recognition was intentionally stopped"
        );

        return;
      }

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldListenRef.current = false;

        setAiText(
          "Please allow microphone permission."
        );

        return;
      }

      if (event.error === "no-speech") {
        console.log(
          "ℹ️ No speech detected"
        );

        return;
      }

      console.warn(
        "Recognition error:",
        event.error
      );
    };

    // ================================
    // ON END
    // ================================

    recognition.onend = () => {
      console.log("🎤 Recognition ended");

      isRecognizingRef.current = false;

      setListening(false);

      // Restart only when assistant should listen
      if (
        isMountedRef.current &&
        shouldListenRef.current &&
        !isSpeakingRef.current &&
        !isProcessingRef.current
      ) {
        restartRecognition();
      }
    };

    // ================================
    // GREETING
    // ================================

    const greetingText = `Hello ${
      userData.name || ""
    }, what can I help you with?`;

    const greeting =
      new SpeechSynthesisUtterance(greetingText);

    greeting.lang = "en-US";

    greeting.onstart = () => {
      console.log("👋 Greeting started");

      isSpeakingRef.current = true;

      shouldListenRef.current = false;
    };

    greeting.onend = () => {
      console.log("👋 Greeting finished");

      if (!isMountedRef.current) return;

      isSpeakingRef.current = false;

      shouldListenRef.current = true;

      restartRecognition();
    };

    greeting.onerror = () => {
      console.log("Greeting speech error");

      if (!isMountedRef.current) return;

      isSpeakingRef.current = false;

      shouldListenRef.current = true;

      restartRecognition();
    };

    // Start greeting

    window.speechSynthesis.cancel();

    window.speechSynthesis.speak(greeting);

    // ================================
    // CLEANUP
    // ================================

    return () => {
      console.log("🧹 Cleaning Home");

      isMountedRef.current = false;

      shouldListenRef.current = false;

      clearTimeout(
        restartTimeoutRef.current
      );

      window.speechSynthesis.cancel();

      // Remove handlers first
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      // Abort only during unmount
      try {
        recognition.abort();
      } catch (error) {
        console.log("Cleanup error:", error);
      }

      isRecognizingRef.current = false;
      isProcessingRef.current = false;
      isSpeakingRef.current = false;

      recognitionRef.current = null;
    };
  }, [
    userData?.assistantName,
    userData?.name,
    handleCommand,
    restartRecognition,
    speak,
  ]);

  // ================================
  // UI
  // ================================

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">

      {/* MOBILE MENU */}

      <CgMenuRight
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
        onClick={() => setHam(true)}
      />

      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start z-50 ${
          ham
            ? "translate-x-0"
            : "translate-x-full"
        } transition-transform`}
      >
        <RxCross1
          className="text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
          onClick={() => setHam(false)}
        />

        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>

        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px]"
          onClick={() =>
            navigate("/customize")
          }
        >
          Customize your Assistant
        </button>

        <div className="w-full h-[2px] bg-gray-400"></div>

        <h1 className="text-white font-semibold text-[19px]">
          History
        </h1>

        <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate">
          {userData?.history?.map(
            (his, index) => (
              <div
                key={index}
                className="text-gray-200 text-[18px] w-full h-[30px]"
              >
                {his}
              </div>
            )
          )}
        </div>
      </div>

      {/* DESKTOP LOGOUT */}

      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px]"
        onClick={handleLogOut}
      >
        Log Out
      </button>

      {/* DESKTOP CUSTOMIZE */}

      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block"
        onClick={() =>
          navigate("/customize")
        }
      >
        Customize your Assistant
      </button>

      {/* ASSISTANT IMAGE */}

      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt="Assistant"
          className="h-full object-cover"
        />
      </div>

      {/* ASSISTANT NAME */}

      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {/* ANIMATION */}

      {!aiText && (
        <img
          src={userImg}
          alt="User"
          className="w-[200px]"
        />
      )}

      {aiText && (
        <img
          src={aiImg}
          alt="AI"
          className="w-[200px]"
        />
      )}

      {/* TEXT */}

      <h1 className="text-white text-[18px] font-semibold text-wrap text-center px-4">
        {userText
          ? userText
          : aiText
          ? aiText
          : listening
          ? "🎤 Listening..."
          : null}
      </h1>
    </div>
  );
}

export default Home;
