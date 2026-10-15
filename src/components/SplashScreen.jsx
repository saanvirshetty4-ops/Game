// Loading screen with the squishing jelly blob and progress bar.
export default function SplashScreen(){
  return (
    <div className="screen active" id="splash">
      <div className="jellyBlobWrap big"><div className="jellyBlob"></div></div>
      <h1>Drop &amp; Merge</h1>
      <div className="loadbar"><i></i></div>
    </div>
  );
}
