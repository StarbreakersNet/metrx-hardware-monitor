<script setup>
import {
  checkForUpdates as checkUpdates,
  installUpdate as installDownloadedUpdate,
} from "@/api/updater";
import AppUtils, { delay, formatBytes } from "@/appUtils";
import AppIcon from "@/components/Utils/AppIcon.vue";
import { useSystemStore } from "@/stores/system";
import { useUserStore } from "@/stores/user";
import { useMessage, useThemeVars } from "naive-ui";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const user = useUserStore();
const system = useSystemStore();
const theme = useThemeVars();
const { t } = useI18n();

const version = computed(() => "v" + system.app.version);
const nMessage = useMessage();
const downloadProgress = reactive({
  active: false,
  transferred: "",
  total: "",
  bytesPerSecond: "",
  percent: 0,
});
const isUpdateAvailable = ref(false);
const loaders = reactive({
  main: new AppUtils.Loader(),
});
const silentUpdate = ref(false);
let message = null;

function createMessage(type, content) {
  removeMessage();
  switch (type) {
    case "loading":
      message = nMessage.loading(content, {
        duration: 0,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "success":
      message = nMessage.success(content, {
        duration: 1000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "warning":
      message = nMessage.warning(content, {
        duration: 5000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
    case "error":
      message = nMessage.error(
        content.split("\n")[0] + (content.split("\n").length > 1 ? "..." : ""),
        {
          duration: 0,
          closable: true,
          keepAliveOnHover: true,
        }
      );
      break;
    default:
      message = nMessage.info(content, {
        duration: 3000,
        closable: false,
        keepAliveOnHover: true,
      });
      break;
  }
}

function removeMessage() {
  if (message) {
    message.destroy();
    message = null;
  }
}

function onUpdaterEvent({ event, data }) {
  switch (event) {
    case "checking":
      if (!silentUpdate.value) {
        createMessage("loading", t("updater.checking", { version: version.value }));
      }
      break;

    case "available":
      if (!silentUpdate.value) {
        createMessage("success", t("updater.available"));
      }
      break;

    case "notAvailable":
      if (!silentUpdate.value) {
        createMessage("info", t("updater.notAvailable"));
      }
      loaders.main.stop();
      break;

    case "cancelled":
      if (!silentUpdate.value) {
        createMessage("warning", t("updater.cancelled", { message: data.message }));
      }
      loaders.main.stop();
      break;

    case "progress":
      onDownloadProgress(data);
      break;

    case "downloaded":
      onUpdateDownloaded();
      break;

    case "error":
      createMessage("error", t("updater.error", { message: data.message }));
      console.error("[Updater]:", data.message);
      loaders.main.stop();
      break;

    case "log":
      console.log("[Updater]:", data.message);
      break;
  }
}

function onDownloadProgress(progress) {
  let formatedTransferred = formatBytes(progress.transferred);
  let formatedTotal = formatBytes(progress.total);
  let formatedBytesPerSecond = formatBytes(progress.bytesPerSecond);
  let roundedPercent = Math.round(progress.percent);

  downloadProgress.transferred = formatedTransferred.value + " " + formatedTransferred.unit;
  downloadProgress.total = formatedTotal.value + " " + formatedTotal.unit;
  downloadProgress.bytesPerSecond =
    formatedBytesPerSecond.value + " " + formatedBytesPerSecond.unit + "/s";
  downloadProgress.percent = roundedPercent;

  if (!downloadProgress.active) {
    downloadProgress.active = true;
    if (!silentUpdate.value) {
      createMessage(
        "loading",
        t("updater.downloading", {
          transferred: downloadProgress.transferred,
          total: downloadProgress.total,
          percent: downloadProgress.percent,
          speed: downloadProgress.bytesPerSecond,
        })
      );
    }
  }
}

async function onUpdateDownloaded() {
  downloadProgress.transferred = downloadProgress.total;
  downloadProgress.percent = 100;
  await delay(250);

  downloadProgress.active = false;
  if (!silentUpdate.value) {
    createMessage("success", t("updater.downloaded"));
  }
  loaders.main.stop();
  isUpdateAvailable.value = true;
}

async function checkForUpdates(isSilent = false) {
  silentUpdate.value = isSilent;
  loaders.main.start();

  try {
    await checkUpdates(user.settings.updateChannel, onUpdaterEvent);
  } catch (error) {
    onUpdaterEvent({ event: "error", data: { message: String(error) } });
  }
}

async function installUpdate() {
  loaders.main.start();

  try {
    await installDownloadedUpdate();
  } catch (error) {
    onUpdaterEvent({ event: "error", data: { message: String(error) } });
  }
}

// Les versions Live / Preview / Nightly viennent exclusivement des tags de release (voir
// .github/workflows/deploy.yml) : tout le reste (ex : 0.0.0-dev) est une version de dev.
const buildType = computed(() => {
  if (system.app.version) {
    const types = {
      stable: {
        label: "Live",
        icon: "boltFilled",
        pattern: /^\d+\.\d+\.\d+$/,
      },
      beta: {
        label: "Preview",
        icon: "flaskFilled",
        pattern: /^\d+\.\d+\.\d+-beta(\.\d+)?$/,
      },
      alpha: {
        label: "Nightly",
        icon: "radioactiveFilled",
        pattern: /^\d+\.\d+\.\d+-alpha(\.\d+)?$/,
      },
      dev: {
        label: "Dev",
        icon: "code",
      },
    };

    const typeKeys = Object.keys(types);
    const foundKey = typeKeys.find(key => types[key].pattern?.test(system.app.version));

    return foundKey ? types[foundKey] : types.dev;
  } else {
    return "loading";
  }
});

onMounted(() => {
  if (user.settings.autoUpdate) {
    checkForUpdates(true);
  }
});

onBeforeUnmount(() => {
  removeMessage();
});

watch(
  () => user.settings.updateChannel,
  () => {
    checkForUpdates(false);
  }
);
</script>

<template>
  <n-tag :bordered="false" round type="primary">
    <n-flex align="center" size="small">
      <n-popover v-if="buildType !== 'loading'" :show-arrow="false" trigger="hover">
        <template #trigger>
          <app-icon :name="buildType.icon" />
        </template>
        <template #default>
          {{ t("updater.buildVersion", { type: buildType.label, version }) }}
        </template>
      </n-popover>
      <app-icon
        v-if="buildType === 'loading'"
        class="tw:animate-spin"
        name="compassFilled"
        size="1.25em" />
      <transition v-else mode="out-in" name="insert">
        <div v-if="!isUpdateAvailable">
          <n-popover :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button
                :bordered="false"
                :loading="loaders.main.loading"
                size="tiny"
                @click="checkForUpdates()">
                <template #icon>
                  <app-icon name="refresh" />
                </template>
              </n-button>
            </template>
            <template #default>{{ t("updater.check") }}</template>
          </n-popover>
        </div>
        <n-flex v-else :size="0" align="center">
          <n-text class="update-subtitle">{{ t("updater.newVersion") }}</n-text>
          <n-popover :show-arrow="false" trigger="hover">
            <template #trigger>
              <n-button
                :bordered="false"
                :loading="loaders.main.loading"
                size="tiny"
                @click="installUpdate()">
                <template #icon>
                  <app-icon
                    :color="theme.warningColor"
                    class="tw:animate-pulse"
                    name="download"
                    size="1.5em" />
                </template>
              </n-button>
            </template>
            <template #default>{{ t("updater.install") }}</template>
          </n-popover>
        </n-flex>
      </transition>
    </n-flex>
  </n-tag>
</template>

<style lang="sass">
.update-subtitle
  font-size: 0.8em
  font-weight: 400
  color: var(--n-color-text)
</style>
