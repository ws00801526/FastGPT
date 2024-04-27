import React, { useCallback } from 'react';
import { ModalBody, Box, Flex, Input, ModalFooter, Button, Link } from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useQuery } from '@tanstack/react-query';
import MySelect from '@fastgpt/web/components/common/MySelect';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { putUpdateTeam } from '@/web/support/user/team/api';
import { useUserStore } from '@/web/support/user/useUserStore';
import type { LafAccountType } from '@fastgpt/global/support/user/team/type.d';
import { postLafPat2Token, getLafApplications } from '@/web/support/laf/api';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { getDocPath } from '@/web/common/system/doc';

const LafAccountModal = ({
  defaultData = {
    token: '',
    appid: '',
    pat: ''
  },
  onClose
}: {
  defaultData?: LafAccountType;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { register, handleSubmit, setValue, getValues, watch, reset } = useForm({
    defaultValues: {
      ...defaultData,
      pat: ''
    }
  });

  const lafToken = watch('token');
  const pat = watch('pat');
  const appid = watch('appid');

  const { feConfigs } = useSystemStore();
  const { toast } = useToast();
  const { userInfo, initUserInfo } = useUserStore();

  const onResetForm = useCallback(() => {
    reset({
      token: '',
      appid: '',
      pat: ''
    });
  }, [reset]);

  const { mutate: authLafPat, isLoading: isPatLoading } = useRequest({
    mutationFn: async (pat) => {
      const token = await postLafPat2Token(pat);
      setValue('token', token);
    },
    errorToast: t('plugin.Invalid Env')
  });

  const { data: appListData = [] } = useQuery(
    ['appList', lafToken],
    () => {
      return getLafApplications(lafToken);
    },
    {
      enabled: !!lafToken,
      onSuccess: (data) => {
        if (!getValues('appid') && data.length > 0) {
          setValue('appid', data[0].appid);
        }
      },
      onError: (err) => {
        onResetForm();
        toast({
          title: getErrText(err, '获取应用列表失败'),
          status: 'error'
        });
      }
    }
  );

  const { mutate: onSubmit, isLoading: isUpdating } = useRequest({
    mutationFn: async (data: LafAccountType) => {
      if (!userInfo?.team.teamId) return;
      return putUpdateTeam({
        teamId: userInfo?.team.teamId,
        lafAccount: data
      });
    },
    onSuccess() {
      initUserInfo();
      onClose();
    },
    successToast: t('common.Update Success'),
    errorToast: t('common.Update Failed')
  });

  return (
    <MyModal isOpen iconSrc="/imgs/workflow/laf.png" title={t('user.Laf Account Setting')}>
      <ModalBody>
        <Box fontSize={'sm'} color={'myGray.500'}>
          <Box>{t('support.user.Laf account intro')}</Box>
          <Box textDecoration={'underline'}>
            <Link href={getDocPath('/docs/workflow/modules/laf/')} isExternal>
              {t('support.user.Laf account course')}
            </Link>
          </Box>
          <Box>
            <Link textDecoration={'underline'} href={`${feConfigs.lafEnv}/`} isExternal>
              {t('support.user.Go laf env', { env: feConfigs.lafEnv })}
            </Link>
          </Box>
        </Box>
        <Flex alignItems={'center'} mt={5}>
          <Box flex={'0 0 70px'}>PAT:</Box>
          {!lafToken ? (
            <>
              <Input
                flex={'1 0 0'}
                size={'sm'}
                {...register('pat')}
                placeholder={t('plugin.Enter PAT')}
              />
              <Button
                ml={2}
                variant={'whitePrimary'}
                isDisabled={!pat}
                onClick={() => {
                  authLafPat(pat);
                }}
                isLoading={isPatLoading}
              >
                验证
              </Button>
            </>
          ) : (
            <Button
              variant={'whitePrimary'}
              onClick={() => {
                onResetForm();
                putUpdateTeam({
                  teamId: userInfo?.team.teamId || '',
                  lafAccount: { token: '', appid: '', pat: '' }
                });
              }}
            >
              已验证，点击取消绑定
            </Button>
          )}
        </Flex>
        {!!lafToken && (
          <Flex alignItems={'center'} mt={5}>
            <Box flex={'0 0 70px'}>{t('plugin.Currentapp')}</Box>
            <MySelect
              minW={'200px'}
              list={
                appListData
                  .filter((app) => app.state === 'Running')
                  .map((app) => ({
                    label: `${app.name}`,
                    value: app.appid
                  })) || []
              }
              placeholder={t('plugin.App')}
              value={watch('appid')}
              onchange={(e) => {
                setValue('appid', e);
              }}
              {...(register('appid'), { required: true })}
            />
          </Flex>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant={'whiteBase'} onClick={onClose}>
          {t('common.Close')}
        </Button>
        {appid && (
          <Button ml={3} isLoading={isUpdating} onClick={handleSubmit((data) => onSubmit(data))}>
            {t('common.Update')}
          </Button>
        )}
      </ModalFooter>
    </MyModal>
  );
};

export default LafAccountModal;
