// SPDX-License-Identifier: Apache-2.0
// Copyright 2024-2026 ThitsaWorks Pte. Ltd.
import './App.css'
import { RouterProvider } from 'react-router-dom'
import { router } from '@routes'
import LoadingContextProvider from '@contexts/LoadingContext'
import { ReportDownloadProvider } from '@contexts/ReportDownloadContext'
import { useToast } from '@chakra-ui/react'
import { getErrorMessage } from '@helpers/errors'

function App() {
  const toast = useToast()

  const handleDownloadReady = (reportName: string, fileName: string) => {
    const toastId = `${reportName}-ready`
    if (!toast.isActive(toastId)) {
      // Format report name: "SettlementBankReport_UseCase" -> "SettlementBankReport (UseCase)"
      // or "SettlementBankReport" -> "Settlement Bank Report"
      let formattedName = reportName;
      if (reportName.includes('_')) {
        const [main, suffix] = reportName.split('_');
        const formattedMain = main.replace(/([a-z])([A-Z])/g, '$1 $2');
        const formattedSuffix = suffix.replace(/([a-z])([A-Z])/g, '$1 $2');
        formattedName = `${formattedMain} (${formattedSuffix})`;
      } else {
        formattedName = reportName.replace(/([a-z])([A-Z])/g, '$1 $2');
      }
      
      toast({
        id: toastId,
        position: 'top',
        description: `Your ${formattedName} is ready.`,
        status: 'success',
        isClosable: true,
        duration: 5000,
      })
    }
  }

  const handleError = (reportName: string, error:any ) => {
    toast({
      position: 'top',
      description: getErrorMessage(error) || 'Failed to request report',
      status: 'error',
      isClosable: true,
      duration: 10000,
    })
  }

  return (
    <ReportDownloadProvider onDownloadReady={handleDownloadReady} onError={handleError}>
      <LoadingContextProvider>
        <RouterProvider router={router} />
      </LoadingContextProvider>
    </ReportDownloadProvider>
  )
}

export default App
