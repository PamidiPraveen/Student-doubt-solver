/** St. Ann's College of Engineering & Technology crest. */
export const COLLEGE_NAME = "St. Ann’s College of Engineering & Technology";

export function CollegeLogo({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={size > 96 ? "/college-logo.png" : "/college-logo-128.png"}
      width={size}
      height={size}
      alt="St. Ann’s College of Engineering and Technology, Chirala"
      className={`college-logo ${className}`}
      decoding="async"
    />
  );
}
