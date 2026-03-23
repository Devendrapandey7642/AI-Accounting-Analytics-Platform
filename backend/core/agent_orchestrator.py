from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """
    Orchestrates the execution of multiple AI agents in a coordinated workflow.
    Manages dependencies, parallel execution, and error handling.
    """

    def __init__(self):
        self.agents = {}
        self.workflows = {}
        self.executor = ThreadPoolExecutor(max_workers=4)

    def register_agent(self, name: str, agent_class, config: Dict[str, Any] = None):
        """Register an agent with the orchestrator"""
        self.agents[name] = {
            'class': agent_class,
            'config': config or {},
            'instance': None
        }
        logger.info(f"Registered agent: {name}")

    def define_workflow(self, name: str, steps: List[Dict[str, Any]]):
        """
        Define a workflow with steps and dependencies

        Example:
        steps = [
            {
                'name': 'data_intelligence',
                'agent': 'dataset_intelligence_agent',
                'inputs': ['upload_id'],
                'outputs': ['dataset_info', 'column_types']
            },
            {
                'name': 'quality_analysis',
                'agent': 'data_quality_agent',
                'inputs': ['dataset_info'],
                'outputs': ['quality_score', 'issues']
            }
        ]
        """
        self.workflows[name] = steps
        logger.info(f"Defined workflow: {name} with {len(steps)} steps")

    async def execute_workflow(self, workflow_name: str, initial_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a complete workflow asynchronously"""
        if workflow_name not in self.workflows:
            raise ValueError(f"Workflow {workflow_name} not defined")

        workflow = self.workflows[workflow_name]
        context = initial_inputs.copy()
        results = {}

        logger.info(f"Starting workflow execution: {workflow_name}")

        for step in workflow:
            step_name = step['name']
            agent_name = step['agent']

            # Prepare inputs for this step
            step_inputs = {}
            for input_name in step.get('inputs', []):
                if input_name in context:
                    step_inputs[input_name] = context[input_name]
                else:
                    raise ValueError(f"Missing input {input_name} for step {step_name}")

            logger.info(f"Executing step: {step_name} with agent: {agent_name}")

            try:
                # Execute the step
                step_result = await self._execute_step(agent_name, step_inputs)

                # Store outputs in context for next steps
                if 'outputs' in step:
                    for output_name in step['outputs']:
                        if output_name in step_result:
                            context[output_name] = step_result[output_name]

                results[step_name] = step_result

            except Exception as e:
                logger.error(f"Step {step_name} failed: {e}")
                # Continue with other steps or handle error based on workflow config
                if step.get('required', True):
                    raise e
                else:
                    results[step_name] = {'error': str(e)}

        logger.info(f"Workflow {workflow_name} completed successfully")
        return results

    async def _execute_step(self, agent_name: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single step using the appropriate agent"""
        if agent_name not in self.agents:
            raise ValueError(f"Agent {agent_name} not registered")

        agent_config = self.agents[agent_name]

        # Create agent instance if not exists
        if agent_config['instance'] is None:
            agent_class = agent_config['class']
            agent_config['instance'] = agent_class(**agent_config['config'])

        agent = agent_config['instance']

        # Execute agent in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self.executor,
            self._run_agent_method,
            agent,
            inputs
        )

        return result

    def _run_agent_method(self, agent, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Run the agent's main processing method"""
        # Assume agents have a 'process' method that takes inputs dict
        if hasattr(agent, 'process'):
            return agent.process(inputs)
        elif hasattr(agent, 'analyze'):
            return agent.analyze(inputs)
        elif hasattr(agent, 'run'):
            return agent.run(inputs)
        else:
            raise AttributeError(f"Agent {type(agent).__name__} has no suitable execution method")

    async def get_workflow_status(self, workflow_name: str) -> Dict[str, Any]:
        """Get the current status of a running workflow"""
        # This would need to be implemented with proper workflow tracking
        return {'status': 'not_implemented'}

    def shutdown(self):
        """Clean shutdown of the orchestrator"""
        self.executor.shutdown(wait=True)
        logger.info("Agent orchestrator shut down")

# Global orchestrator instance
orchestrator = AgentOrchestrator()

# Register core agents
from backend.agents.dataset_intelligence_agent import DatasetIntelligenceAgent
orchestrator.register_agent('dataset_intelligence_agent', DatasetIntelligenceAgent)

# Define core workflows
orchestrator.define_workflow('dataset_intelligence', [
    {
        'name': 'analyze_dataset',
        'agent': 'dataset_intelligence_agent',
        'inputs': ['upload_id'],
        'outputs': ['dataset_info', 'column_types', 'data_quality', 'recommendations'],
        'required': True
    }
])