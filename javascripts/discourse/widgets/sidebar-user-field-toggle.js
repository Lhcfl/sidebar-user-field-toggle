import { createWidget } from "discourse/widgets/widget";
import { userPath } from "discourse/lib/url";
import { ajax } from "discourse/lib/ajax";
import I18n from "I18n";
import { popupAjaxError } from "discourse/lib/ajax-error";

let user_fields;

function toggleUserField(uf_id) {
  user_fields[uf_id] = user_fields[uf_id] === "true" ? "false" : "true";
}

createWidget("sidebar-user-field-toggle-button", {
  tagName: "span.sidebar-user-field-toggle",

  html(attrs) {
    let className = `btn sidebar-footer-actions-button toggle-field-${this.attrs.fid}`;
    let data = {
      action: "updateStatus",
      label: attrs.label,
      title: attrs.title,
    };
    if (attrs.enable === "true") {
      if (attrs.emphasize === "enabled" || attrs.emphasize === "both") {
        className += " emphasized";
      }
      data.icon = attrs.svg_enabled;
    } else {
      if (attrs.emphasize === "disabled" || attrs.emphasize === "both") {
        className += " emphasized";
      }
      data.icon = attrs.svg_disabled;
    }
    data.className = className;
    return this.attach("button", data);
  },

  updateStatus() {
    toggleUserField(this.attrs.fid);
    ajax(userPath(`${this.currentUser.username_lower}.json`), {
      data: {
        user_fields,
      },
      type: "PUT",
    })
      .then((res) => {
        // user_fields = res.user.user_fields;

        // Use `api.onAppEvent("sidebar_user_fields_updated", (user) => { ... });`
        // to handle user_field change event
        this.appEvents.trigger("sidebar_user_fields_updated", res.user);
      })
      .catch(popupAjaxError);
    // Use `api.onAppEvent("sidebar_user_fields_toggled", (e) => { ... });`
    // to handle button toggle event
    this.appEvents.trigger("sidebar_user_fields_toggled", { user_fields });
  },
});

export default createWidget("sidebar-user-field-toggle", {
  tagName: "span",

  html(attrs) {
    if (!user_fields) {
      user_fields = {};
      ajax(userPath(`${attrs.currentUser.username_lower}.json`)).then((res) => {
        user_fields = res.user.user_fields;
        // By definition it is automatic toggle
        // Use `api.onAppEvent("sidebar_user_fields_toggled", (e) => { ... });`
        this.appEvents.trigger("sidebar_user_fields_toggled", { user_fields });
        this.sendWidgetAction("update");
      });
    }

    const fieldSet = JSON.parse(settings.user_field_settings);
    const buttonlist = [];
    const mp = {};

    for (const uf of this.site.user_fields) {
      mp[String(uf.id)] = uf.id;
      mp[String(uf.name)] = uf.id;
    }

    if (!I18n.translations[I18n.currentLocale()].js.sidebar_toggle) {
      I18n.translations[I18n.currentLocale()].js.sidebar_toggle = {};
    }

    for (const {
      name_or_id,
      label,
      title,
      svg_enabled,
      svg_disabled,
      emphasize,
    } of fieldSet) {
      const fid = mp[name_or_id];
      if (!fid) {
        continue;
      }
      I18n.translations[I18n.currentLocale()].js.sidebar_toggle[
        `label_${fid}`
      ] = label;
      I18n.translations[I18n.currentLocale()].js.sidebar_toggle[
        `title_${fid}`
      ] = title;
      buttonlist.push(
        this.attach("sidebar-user-field-toggle-button", {
          fid,
          enable: user_fields[fid],
          label: label === "" ? undefined : `sidebar_toggle.label_${fid}`,
          title: title === "" ? undefined : `sidebar_toggle.title_${fid}`,
          svg_enabled,
          svg_disabled,
          emphasize,
        })
      );
    }
    return buttonlist;
  },

  update() {
    return this;
  },
});
