import React, { useEffect, useState } from "react";
import axios from 'axios';
import configData from './../config.js';
import lens from "./../assets/lens.png";
import loadingGif from "./../assets/loading.gif";

function Chat() {
    const [prompt, updatePrompt] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [answer, setAnswer] = useState(undefined);

    useEffect(() => {
        if (prompt != null && prompt.trim() === "") {
            setAnswer(undefined);
        }
    }, [prompt]);

    const sendPrompt = async (event) => {
        if (event.key !== "Enter") {
            return;
        }
        try {
            setLoading(true);
            
            const requestOptions = {
                method: "POST",
                header: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            };

            const res = await axios.post(configData.API_SERVER + "chatbot", requestOptions);
            console.log(res.data, "response")

            const message = res.data;
            setAnswer(message);
        } catch (err) {
            console.error(err, "err");
        } finally {
            setLoading(false);
        }
        console.log('prompt', prompt)
    }

    return (
        <main>
            <div className="spotlight__wrapper">
                <input
                    type="text"
                    className="spotlight__input"
                    placeholder="Ask me anything..."
                    disabled={loading}
                    style={{
                        backgroundImage: loading ? `url(${loadingGif})` : `url(${lens})`,
                    }}
                    onChange={(e) => updatePrompt(e.target.value)}
                    onKeyDown={(e) => sendPrompt(e)}
                />
                <div className="spotlight__answer">
                    {answer && <p>{answer}</p>}
                </div>
            </div>
        </main>
    )
}



export default Chat;