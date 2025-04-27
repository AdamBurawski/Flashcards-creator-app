interface SuccessNotificationProps {
  message: string;
  onDismiss?: () => void;
}

const SuccessNotification = ({ message, onDismiss }: SuccessNotificationProps) => {
  if (!message) {
    return null;
  }

  return (
    <div className="bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded-md relative">
      <div className="pr-8">{message}</div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-green-700 hover:bg-green-200 rounded-full p-1"
          aria-label="Zamknij komunikat o sukcesie"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
};

export default SuccessNotification;
