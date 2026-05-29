import BoxSelectionLarge from "@/components/ui-components/box-selection/box-selection-large";
import BoxSelectionSmall from "@/components/ui-components/box-selection/box-selection-small";
import Header1 from "@/components/ui-components/navs/header-1";
import Header2 from "@/components/ui-components/navs/header2";
import Header3 from "@/components/ui-components/navs/header3";
import ButtonDark from "@/components/ui-components/buttons/button-dark";
import TextInput from "@/components/ui-components/buttons/input-fields/text-input";
import DropDownMenu from "@/components/ui-components/drop-down/drop-down-menu";
import CopyLink from "@/components/ui-components/links/copy-link";
import LinkCopied from "@/components/ui-components/links/link-copied";
import UploadArea from "@/components/ui-components/upload-area/upload-area";
import CustomAudioPlayerDemo from "@/components/output/CustomAudioPlayerDemo";

export default function UiComponentsPage() {
  return (
    <section>
      <h1 className="text-h2 mt-12 mb-12">UI Components</h1>
      {/* components */}
      <div>
        {/* buttons */}
        <div className="buttons mb-12  flex flex-col gap-4">
          <p className="text-h3 mb-4">Buttons</p>

          <div>
            <ButtonDark text="Text" />
          </div>
        </div>

        {/* box selection */}
        <div className=" flex flex-col gap-4 mb-12">
          <p className="text-h3">Box Selection</p>
          <div className="large-box">
            <BoxSelectionLarge />
          </div>
          <div className="small-box">
            <BoxSelectionSmall />
          </div>
        </div>

        {/* Copy Link */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3">Copy Link</p>

          <div>
            <CopyLink />
          </div>

          <div>
            {" "}
            <LinkCopied />
          </div>
        </div>

        {/* Drop Down Menu */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3">Drop Down Menu</p>

          <div>
            <DropDownMenu title="Text" />
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3 ">Navigation/Headers</p>

          <div>
            <Header1 />
          </div>
          <div>
            <Header2 />
          </div>
          <div>
            <Header3 />
          </div>
        </div>

        {/* Text Field */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3">Text Field</p>
          <div>
            <TextInput />
          </div>
        </div>

        {/* Upload Box */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3">Upload Box</p>

          <div>
            <UploadArea />
          </div>
        </div>

        {/* Audio Player */}
        <div className="flex flex-col gap-4 mb-12">
          <p className="text-h3">Audio Player</p>

          <CustomAudioPlayerDemo />
        </div>
      </div>
    </section>
  );
}
