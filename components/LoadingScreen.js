import BrandMark from '@/components/BrandMark';

export default function LoadingScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="cp-page cp-loadingScreen">
      <div className="cp-glass cp-loadingCard">
        <BrandMark size="lg" align="center" />
        <p>{message}</p>
      </div>
    </div>
  );
}
