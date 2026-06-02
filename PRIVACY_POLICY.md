# Privacy Policy

Effective date: June 2, 2026

## TL;DR

**Force Paster does not collect your pasted text, clipboard contents, page
contents, personal information, account information, payment information, or
full browsing history.** **It does not sell personal data or use analytics for
ad targeting.**

The extension stores only the settings and operating state it needs to work,
and may send limited operational analytics events to help maintain the
extension. Paste analytics may include the website domain and element type
where a paste completed, but **not the pasted text, page contents, or full
URL.**

Force Paster is a browser extension that lets you paste text into input fields,
text areas, and supported editable page regions even when a website tries to
block paste events.

## Personal Data

**Force Paster does not ask for your name, email address, account information,
or payment information.** **It does not collect or send pasted text, rich
clipboard data, page contents, or full browsing history.**

When Force Paster is enabled and you paste into a supported field, the content
script reads the clipboard data from that paste event only so it can insert the
data into the focused field. For contenteditable editors, the extension may
replay the paste event inside the page so the site's own editor can handle rich
clipboard formats. **Clipboard contents are not stored by the extension or sent
to us.**

## Local Settings

The extension uses browser extension storage to save settings and operating
state, including whether Force Paster is enabled, toggle count, paste count,
rating prompt state, dashboard state, the last handled field type, and the last
handled website domain. This data is stored in your browser's extension storage
and is used to keep the extension working consistently.

The extension may also store non-personal installation, client, and session
identifiers locally to support operational analytics. Removing the extension
clears extension storage according to your browser's behavior.

## Limited Operational Analytics

The extension may send limited analytics events to understand extension health
and usage. These events can include actions such as install, update, enable or
disable, paste completed, context menu click, options page open, options page
click, and rating prompt response.

Event data may include the extension version, browser or platform metadata,
locale, time zone, generated client/session identifiers, enabled state, event
source, menu item, rating choice, paste count, paste count bucket, the focused
element type, and the website domain where a paste completed.

**Pasted text, rich clipboard contents, page contents, and full URLs are not
sent in analytics events.** Analytics data is used to maintain and improve the
extension, **not to sell personal data or target advertising.**

Analytics events are sent through a Cloud Functions proxy before being processed
by Google Analytics. Analytics failures do not block extension behavior.

## Uninstall Page

If you uninstall the extension, your browser may open the Force Paster uninstall
page. That URL may include operational debug data such as extension version,
browser/platform metadata, locale, time zone, install or update date, enabled
state, usage counts, rating prompt state, last handled field type, and last
handled website domain. This information is used to diagnose extension issues
and improve the extension.

## Browser And Website Policies

When you use Force Paster, your browser and the websites you visit still process
your browsing and paste interactions according to their own privacy policies.
For example, the website you paste into receives the pasted content as part of
the normal paste workflow, and your browser handles extension storage, tab
navigation, and any account-level behavior it provides.

## Contact And Issues

To report a privacy concern, bug, or support request, open an issue in the Force
Paster repository:

https://github.com/prvashisht/force-paster/issues

## Changes

This policy may be updated when the extension's behavior changes. Updates will
be published in this repository.
