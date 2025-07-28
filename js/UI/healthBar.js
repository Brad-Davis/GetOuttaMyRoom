class HealthBar {
    constructor (healthBarElement, player) {
        this.healthBarElement = healthBarElement;
        this.healthBarText = healthBarElement.querySelector('span');
        this.healthBarProgress = healthBarElement.querySelector('progress');
        this.player = player;
    }

    showHealthBar() {
        this.healthBarElement.style.display = 'block';
        this.updateHealthBar();
    }

    updateHealthBar () {
        this.healthBarText.innerText = this.player.getHpString();
        this.healthBarProgress.value = this.player.getHp();
        this.healthBarProgress.max = this.player.maxHp;
    }
}

export default HealthBar;