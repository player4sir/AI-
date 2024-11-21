import TwitterSVG from "../../public/twitter.svg";
import GithubSVG from "../../public/Github.svg";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex items-center justify-center border-t border-[#343434] px-4 py-6 text-center text-sm text-[#6F6F6F]">
      <p>
        由{" "}
        <a
          href="https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium transition-colors hover:text-[#F3F3F3]"
        >
          mzstudio工作室
        </a>{" "}
        开发
      </p>
    </footer>
  );
}
