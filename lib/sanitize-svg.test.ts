import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeSvg } from "./sanitize-svg";

describe("sanitizeSvg", () => {
  const expectNoScript = (out: string) => {
    assert.ok(!/<script\b/i.test(out));
    assert.ok(!/<\/script>/i.test(out));
  };
  const expectNoForeignObject = (out: string) => {
    assert.ok(!/<foreignObject\b/i.test(out));
    assert.ok(!/<\/foreignObject>/i.test(out));
  };
  const expectNoOnAttributes = (out: string) => {
    assert.ok(!/\son\w+=/i.test(out));
  };
  const expectRootSvg512 = (out: string) => {
    assert.ok(/<svg\s[^>]*viewBox="0 0 512 512"/i.test(out));
    assert.ok(/<svg\s[^>]*width="512"/i.test(out));
    assert.ok(/<svg\s[^>]*height="512"/i.test(out));
  };

  describe("Bad SVG – dangerous content removed", () => {
    it("strips <script> elements", () => {
      const input = `<svg><script>alert(1)</script><circle r="10"/></svg>`;
      const out = sanitizeSvg(input);
      expectNoScript(out);
      assert.ok(out.includes("<circle"));
    });

    it("strips <script> with attributes", () => {
      const input = `<svg xmlns="http://www.w3.org/2000/svg"><script type="text/javascript">fetch('/steal')</script><path d="M0 0"/></svg>`;
      const out = sanitizeSvg(input);
      expectNoScript(out);
      assert.ok(out.includes("<path"));
    });

    it("strips <foreignObject> elements", () => {
      const input = `<svg><foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><iframe src="evil"/></body></foreignObject><rect width="5" height="5"/></svg>`;
      const out = sanitizeSvg(input);
      expectNoForeignObject(out);
      assert.ok(out.includes("<rect"));
    });

    it("strips on* event attributes", () => {
      const input = `<svg><circle onclick="alert(1)" onload="x()" onmouseover="y" r="10"/></svg>`;
      const out = sanitizeSvg(input);
      expectNoOnAttributes(out);
      assert.ok(out.includes("<circle"));
      assert.ok(!/onclick|onload|onmouseover/i.test(out));
    });

    it("blocks javascript: in href", () => {
      const input = `<svg><a href="javascript:alert(1)">x</a></svg>`;
      const out = sanitizeSvg(input);
      assert.ok(!/javascript:/i.test(out));
      assert.ok(/href="#"/.test(out));
    });

    it("blocks javascript: in xlink:href", () => {
      const input = `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>`;
      const out = sanitizeSvg(input);
      assert.ok(!/javascript:/i.test(out));
    });

    it("blocks external http(s) and // in href", () => {
      const input = `<svg><a href="https://evil.com/phish">link</a><a href="//evil.com">link2</a></svg>`;
      const out = sanitizeSvg(input);
      assert.ok(!/href="https?:/.test(out));
      assert.ok(!/href="\/\//.test(out));
      assert.ok(/href="#"/.test(out));
    });
  });

  describe("Allowed SVG – normalized consistently", () => {
    it("enforces viewBox and width/height 512 on root svg", () => {
      const input = `<svg width="100" height="200" viewBox="0 0 100 200"><circle cx="50" cy="50" r="10"/></svg>`;
      const out = sanitizeSvg(input);
      expectRootSvg512(out);
      assert.ok(out.includes("<circle"));
    });

    it("adds viewBox/width/height when missing", () => {
      const input = `<svg><rect x="0" y="0" width="10" height="10"/></svg>`;
      const out = sanitizeSvg(input);
      expectRootSvg512(out);
      assert.ok(out.includes("<rect"));
    });

    it("preserves safe href (#anchor and relative)", () => {
      const input = `<svg><a href="#defs"><use href="#icon"/></a></svg>`;
      const out = sanitizeSvg(input);
      assert.ok(out.includes('href="#defs"'));
      assert.ok(out.includes('href="#icon"'));
      expectRootSvg512(out);
    });

    it("preserves safe content and structure", () => {
      const input = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="none" stroke="#000" d="M0 0 L64 64"/></svg>`;
      const out = sanitizeSvg(input);
      expectRootSvg512(out);
      assert.ok(out.includes("<path"));
      assert.ok(out.includes('d="M0 0 L64 64"'));
    });

    it("returns empty string for non-string input", () => {
      assert.strictEqual(sanitizeSvg(""), "");
      assert.strictEqual(sanitizeSvg("   "), "");
    });
  });
});
