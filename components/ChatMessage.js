export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`cp-chatRow${isUser ? ' cp-chatRow--user' : ''}`}>
      {!isUser && <div className="cp-chatAvatar">C</div>}
      <div className={`cp-chatBubble ${isUser ? 'cp-chatBubble--user' : 'cp-chatBubble--assistant'}`}>
        {content}
      </div>
    </div>
  );
}
