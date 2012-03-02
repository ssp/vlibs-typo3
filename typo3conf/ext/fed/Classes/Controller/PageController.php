<?php
/***************************************************************
*  Copyright notice
*
*  (c) 2011 Claus Due <claus@wildside.dk>, Wildside A/S
*
*  All rights reserved
*
*  This script is part of the TYPO3 project. The TYPO3 project is
*  free software; you can redistribute it and/or modify
*  it under the terms of the GNU General Public License as published by
*  the Free Software Foundation; either version 2 of the License, or
*  (at your option) any later version.
*
*  The GNU General Public License can be found at
*  http://www.gnu.org/copyleft/gpl.html.
*
*  This script is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU General Public License for more details.
*
*  This copyright notice MUST APPEAR in all copies of the script!
***************************************************************/

/**
 * Page Controller
 *
 * @package Fed
 * @subpackage Controller
 */
class Tx_Fed_Controller_PageController extends Tx_Fed_Core_AbstractController {

	/**
	 * @var string
	 */
	protected $defaultViewObjectName = 'Tx_Flux_MVC_View_ExposedTemplateView';

	/**
	 * @var Tx_Fed_Configuration_ConfigurationManager
	 */
	protected $configurationManager;

	/**
	 * @var Tx_Fed_Service_Page
	 */
	protected $pageService;

	/**
	 * @param Tx_Fed_Configuration_ConfigurationManager $configurationManager
	 * @return void
	 */
	public function injectConfigurationManager(Tx_Fed_Configuration_ConfigurationManager $configurationManager) {
		$this->configurationManager = $configurationManager;
		$this->settings = $this->configurationManager->getConfiguration(Tx_Extbase_Configuration_ConfigurationManagerInterface::CONFIGURATION_TYPE_SETTINGS);
	}

	/**
	 * @param Tx_Fed_Service_Page $pageLayout
	 */
	public function injectPageService(Tx_Fed_Service_Page $pageService) {
		$this->pageService = $pageService;
	}

	/**
	 * @param Tx_Fed_MVC_View_ExposedTemplateView $view
	 */
	public function initializeView(Tx_Flux_MVC_View_ExposedTemplateView $view) {
		$configuration = $this->pageService->getPageTemplateConfiguration($GLOBALS['TSFE']->id);
		list ($extensionName, $action) = explode('->', $configuration['tx_fed_page_controller_action']);
		$paths = $this->configurationManager->getPageConfiguration($extensionName);
		$flexFormSource = $this->pageService->getPageFlexFormSource($GLOBALS['TSFE']->id);
		$flexformData = $this->flexform->convertFlexFormContentToArray($flexFormSource);
		$view->setLayoutRootPath($paths['layoutRootPath']);
		$view->setPartialRootPath($paths['partialRootPath']);
		$view->setTemplatePathAndFilename($paths['templateRootPath'] . 'Page/' . $action . '.html');
		$view->assignMultiple($flexformData);
		$view->assign('page', $GLOBALS['TSFE']->page);
		$view->assign('user', $GLOBALS['TSFE']->fe_user->user);
		$view->assign('cookies', $_COOKIE);
		$view->assign('session', $_SESSION);
	}

	/**
	 * @return string
	 */
	public function renderAction() {
		return $this->view->render($action);
	}

}

?>