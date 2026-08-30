import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif";

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

  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);

  // NEW: prevents recognition from restarting
  // while Gemini is processing the command
  const isProcessingRef = useRef(false);

  const synth = window.speechSynthesis;

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });

      setUserData(null);
      navigate("/signin");
    } catch (error) {
      console.log("Logout error:", error);

      setUserData(null);
      navigate("/signin");
    }
  };

  // ==========================================
  // START SPEECH RECOGNITION
  // ==========================================

  const startRecognition = () => {
    if (
      !isSpeakingRef.current &&
      !isRecognizingRef.current &&
      !isProcessingRef.current
    ) {
      try {
        recognitionRef.current?.start();

        console.log(
          "Recognition requested to start"
        );
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error(
            "Start error:",
            error
          );
        }
      }
    }
  };

  // ==========================================
  // SPEAK
  // ==========================================

  const speak = (text) => {
    if (!text) {
      isProcessingRef.current = false;
      return;
    }

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "hi-IN";

    const voices =
      window.speechSynthesis.getVoices();

    const hindiVoice = voices.find(
      (v) =>
        v.lang === "hi-IN" ||
        v.lang.startsWith("hi")
    );

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    // Stop current recognition before speaking
    try {
      recognitionRef.current?.stop();
    } catch (error) {
      // Ignore
    }

    isRecognizingRef.current = false;
    setListening(false);

    isSpeakingRef.current = true;

    utterance.onstart = () => {
      console.log("AI started speaking");
    };

    utterance.onend = () => {
      console.log("AI finished speaking");

      setAiText("");

      isSpeakingRef.current = false;
      isProcessingRef.current = false;

      // Start listening again after AI finishes
      setTimeout(() => {
        startRecognition();
      }, 800);
    };

    utterance.onerror = (error) => {
      console.error(
        "Speech synthesis error:",
        error
      );

      setAiText("");

      isSpeakingRef.current = false;
      isProcessingRef.current = false;

      setTimeout(() => {
        startRecognition();
      }, 800);
    };

    // Stop previous speech
    synth.cancel();

    synth.speak(utterance);
  };

  // ==========================================
  // CLEAN YOUTUBE QUERY
  // ==========================================

  const cleanYouTubeQuery = (text) => {
    if (!text) {
      return "";
    }

    let query = text.toLowerCase();

    // Remove assistant name
    if (userData?.assistantName) {
      const assistantName =
        userData.assistantName.toLowerCase();

      query = query.replace(
        new RegExp(
          `\\b${assistantName}\\b`,
          "gi"
        ),
        ""
      );
    }

    // Remove common command words
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

  // ==========================================
  // HANDLE COMMAND
  // ==========================================

  const handleCommand = (data) => {
    // IMPORTANT:
    // Prevent destructuring undefined
    if (!data) {
      console.error(
        "No data received from backend"
      );

      setUserText("");

      setAiText(
        "Sorry, I could not process your request."
      );

      speak(
        "Sorry, I could not process your request."
      );

      return;
    }

    const {
      type,
      userInput,
      response,
    } = data;

    console.log(
      "Command received:",
      data
    );

    // ========================================
    // CHECK RESPONSE
    // ========================================

    if (!response) {
      console.error(
        "Invalid backend response:",
        data
      );

      setAiText(
        "Sorry, I could not process your request."
      );

      speak(
        "Sorry, I could not process your request."
      );

      return;
    }

    // ========================================
    // GOOGLE SEARCH
    // ========================================

    if (type === "google-search") {
      const query = encodeURIComponent(
        userInput || ""
      );

      setAiText(response);

      speak(response);

      // Use location instead of window.open
      // because this command comes from speech
      setTimeout(() => {
        window.location.href =
          `https://www.google.com/search?q=${query}`;
      }, 500);

      return;
    }

    // ========================================
    // CALCULATOR
    // ========================================

    if (type === "calculator-open") {
      setAiText(response);

      speak(response);

      setTimeout(() => {
        window.location.href =
          "https://www.google.com/search?q=calculator";
      }, 500);

      return;
    }

    // ========================================
    // INSTAGRAM
    // ========================================

    if (type === "instagram-open") {
      setAiText(response);

      speak(response);

      setTimeout(() => {
        window.location.href =
          "https://www.instagram.com/";
      }, 500);

      return;
    }

    // ========================================
    // FACEBOOK
    // ========================================

    if (type === "facebook-open") {
      setAiText(response);

      speak(response);

      setTimeout(() => {
        window.location.href =
          "https://www.facebook.com/";
      }, 500);

      return;
    }

    // ========================================
    // WEATHER
    // ========================================

    if (type === "weather-show") {
      setAiText(response);

      speak(response);

      setTimeout(() => {
        window.location.href =
          "https://www.google.com/search?q=weather";
      }, 500);

      return;
    }

    // ========================================
    // YOUTUBE OPEN
    // ========================================

    if (type === "youtube-open") {
      setAiText(response);

      speak(response);

      setTimeout(() => {
        window.location.href =
          "https://www.youtube.com/";
      }, 500);

      return;
    }

    // ========================================
    // YOUTUBE SEARCH / PLAY
    // ========================================

    if (
      type === "youtube-search" ||
      type === "youtube-play"
    ) {
      const query =
        cleanYouTubeQuery(userInput);

      console.log(
        "YouTube cleaned query:",
        query
      );

      setAiText(response);

      speak(response);

      setTimeout(() => {
        // If no actual search text,
        // simply open YouTube
        if (!query) {
          window.location.href =
            "https://www.youtube.com/";

          return;
        }

        const encodedQuery =
          encodeURIComponent(query);

        window.location.href =
          `https://www.youtube.com/results?search_query=${encodedQuery}`;
      }, 500);

      return;
    }

    // ========================================
    // NORMAL RESPONSE
    // ========================================

    setAiText(response);

    speak(response);
  };

  // ==========================================
  // SPEECH RECOGNITION USEEFFECT
  // ==========================================

  useEffect(() => {
  if (!userData) return;

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("Speech Recognition is not supported");

    setAiText(
      "Speech recognition is not supported in this browser."
    );

    return;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognitionRef.current = recognition;

  let isMounted = true;

  // ==========================================
  // SAFE START FUNCTION
  // ==========================================

  const startListening = () => {
    if (!isMounted) return;

    if (
      !shouldListenRef.current ||
      isSpeakingRef.current ||
      isProcessingRef.current ||
      isRecognizingRef.current
    ) {
      return;
    }

    try {
      recognition.start();

      console.log("🎤 Recognition requested to start");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error);
      }
    }
  };

  // ==========================================
  // ON START
  // ==========================================

  recognition.onstart = () => {
    console.log("🎤 Recognition started");

    isRecognizingRef.current = true;
    setListening(true);
  };

  // ==========================================
  // ON RESULT
  // ==========================================

  recognition.onresult = async (e) => {
    if (
      isSpeakingRef.current ||
      isProcessingRef.current
    ) {
      return;
    }

    const transcript =
      e.results[e.results.length - 1][0]
        .transcript.trim();

    if (!transcript) return;

    console.log("🗣️ User said:", transcript);

    const assistantName =
      userData?.assistantName?.toLowerCase();

    if (!assistantName) {
      console.error("Assistant name not found");
      return;
    }

    // ========================================
    // WAKE WORD DETECTED
    // ========================================

    if (
      transcript
        .toLowerCase()
        .includes(assistantName)
    ) {
      console.log("🔥 Wake word detected!");

      // Stop listening while processing
      shouldListenRef.current = false;

      isProcessingRef.current = true;

      setUserText(transcript);
      setAiText("");

      try {
        recognition.stop();
      } catch (error) {
        console.log(error);
      }

      try {
        console.log("Sending request to Gemini...");

        const data =
          await getGeminiResponse(transcript);

        console.log("Gemini response:", data);

        setUserText("");

        if (!data) {
          throw new Error(
            "No response received from Gemini"
          );
        }

        handleCommand(data);

      } catch (error) {
        console.error(
          "Gemini request error:",
          error
        );

        setUserText("");

        const errorMessage =
          "Sorry, something went wrong.";

        setAiText(errorMessage);

        speak(errorMessage);
      }
    }
  };

  // ==========================================
  // ON ERROR
  // ==========================================

  recognition.onerror = (event) => {
    console.warn(
      "🎤 Recognition error:",
      event.error
    );

    isRecognizingRef.current = false;
    setListening(false);

    // STOP COMPLETELY for permission problems
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      shouldListenRef.current = false;

      setAiText(
        "Microphone permission is required."
      );

      return;
    }

    // Don't restart here!
    // onend will handle restarting.
  };

  // ==========================================
  // ON END
  // ==========================================

  recognition.onend = () => {
    console.log("🎤 Recognition ended");

    isRecognizingRef.current = false;
    setListening(false);

    // Only restart if Jarvis should listen
    if (
      isMounted &&
      shouldListenRef.current &&
      !isSpeakingRef.current &&
      !isProcessingRef.current
    ) {
      clearTimeout(restartTimeoutRef.current);

      restartTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Restarting recognition...");

        startListening();
      }, 500);
    }
  };

  // ==========================================
  // GREETING
  // ==========================================

  const greeting =
    new SpeechSynthesisUtterance(
      `Hello ${userData?.name || ""}, what can I help you with?`
    );

  greeting.lang = "en-US";

  greeting.onstart = () => {
    console.log("Greeting started");

    isSpeakingRef.current = true;

    // Don't listen while speaking
    shouldListenRef.current = false;
  };

  greeting.onend = () => {
    console.log("Greeting finished");

    isSpeakingRef.current = false;

    // Now Jarvis should listen
    shouldListenRef.current = true;

    setTimeout(() => {
      startListening();
    }, 500);
  };

  greeting.onerror = () => {
    console.log("Greeting error");

    isSpeakingRef.current = false;

    shouldListenRef.current = true;

    setTimeout(() => {
      startListening();
    }, 500);
  };

  // ==========================================
  // START GREETING
  // ==========================================

  window.speechSynthesis.cancel();

  window.speechSynthesis.speak(greeting);

  // ==========================================
  // CLEANUP
  // ==========================================

  return () => {
    console.log("Cleaning speech recognition");

    isMounted = false;

    shouldListenRef.current = false;

    clearTimeout(restartTimeoutRef.current);

    try {
      recognition.stop();
    } catch (error) {}

    window.speechSynthesis.cancel();

    isRecognizingRef.current = false;
    isProcessingRef.current = false;

    recognitionRef.current = null;
  };

}, [userData]);

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">

      {/* Mobile Menu */}
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

      {/* Desktop Logout */}
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px]"
        onClick={handleLogOut}
      >
        Log Out
      </button>

      {/* Desktop Customize */}
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block"
        onClick={() =>
          navigate("/customize")
        }
      >
        Customize your Assistant
      </button>

      {/* Assistant Image */}
      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt="Assistant"
          className="h-full object-cover"
        />
      </div>

      {/* Assistant Name */}
      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {/* User Animation */}
      {!aiText && (
        <img
          src={userImg}
          alt="User"
          className="w-[200px]"
        />
      )}

      {/* AI Animation */}
      {aiText && (
        <img
          src={aiImg}
          alt="AI"
          className="w-[200px]"
        />
      )}

      {/* Text */}
      <h1 className="text-white text-[18px] font-semibold text-wrap text-center">
        {userText
          ? userText
          : aiText
          ? aiText
          : null}
      </h1>
    </div>
  );
}

export default Home;
