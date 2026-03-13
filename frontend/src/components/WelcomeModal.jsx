/**
 * WelcomeModal — First-time user onboarding.
 * Explains the Egg Hunt app and how it works.
 */

export default function WelcomeModal({ onDismiss }) {
    return (
        <div className="modal-overlay">
            <div className="modal-card welcome-modal">
                <span className="modal-emoji">🥚✨</span>
                <h1>Welcome to Egg Hunt!</h1>
                <p className="modal-intro">
                    You've just scanned your first egg! Here's how it works:
                </p>

                <div className="welcome-steps">
                    <div className="welcome-step">
                        <span className="step-icon">📱</span>
                        <div>
                            <h3>Scan QR Codes</h3>
                            <p>Find physical QR codes hidden around campus and scan them with your phone or the in-app scanner.</p>
                        </div>
                    </div>
                    <div className="welcome-step">
                        <span className="step-icon">⭐</span>
                        <div>
                            <h3>Earn Points</h3>
                            <p>Each egg is worth points. Some eggs are rarer than others — legendary eggs are worth the most!</p>
                        </div>
                    </div>
                    <div className="welcome-step">
                        <span className="step-icon">🏆</span>
                        <div>
                            <h3>Climb the Leaderboard</h3>
                            <p>Compete with other players and see who can collect the most points.</p>
                        </div>
                    </div>
                    <div className="welcome-step">
                        <span className="step-icon">🎁</span>
                        <div>
                            <h3>Unlock Prizes</h3>
                            <p>Earn enough points to unlock real prizes and rewards!</p>
                        </div>
                    </div>
                    <div className="welcome-step">
                        <span className="step-icon">🤝</span>
                        <div>
                            <h3>Join the Community</h3>
                            <p>Connect with other hunters through our social channels.</p>
                        </div>
                    </div>
                </div>

                <button className="btn btn-primary btn-full" onClick={onDismiss}>
                    Let's Go! 🚀
                </button>
            </div>
        </div>
    );
}
