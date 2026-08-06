import { Logo } from "./Logo";

export function InfoPanel() {
  return (
    <>
      <div className="self-center">
        <Logo src="/logo-back.png" />
      </div>

      <div className="self-center min-w-0 w-full flex-1">
        <label className="font-display text-xl">HOW TO PLAY</label>

        <div className="mb-6 shrink-0 text-base text-slate-600">
          Each round, players will be shown a prompt. Use{" "}
          <span className="text-lime-400 font-bold">Noun</span>,
          <span className="text-fuchsia-500 font-bold"> Verb</span>, or
          <span className="text-pink-500 font-bold"> Adjective</span> cards to
          fill the corresponding blanks and craft the winning sentence!
        </div>

        <hr className="mb-6 border-ll-blue" />

        <label className="font-display text-xl">CREDITS</label>

        <ul className="mb-6 shrink-0 list-disc pl-5 text-base text-slate-600">
          <li>
            IPA transcriptions provided by{" "}
            <a
              href="https://www.wiktionary.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Wiktionary
            </a>{" "}
            {"<3"}
          </li>
          <li>
            Additional etymology research used{" "}
            <a
              href="https://www.wikipedia.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Wikipedia
            </a>
            ,{" "}
            <a
              href="https://www.merriam-webster.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Merriam-Webster
            </a>
            ,{" "}
            <a
              href="https://www.etymonline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Etymonline
            </a>
            , and Reddit!
          </li>
        </ul>
      </div>
    </>
  );
}
